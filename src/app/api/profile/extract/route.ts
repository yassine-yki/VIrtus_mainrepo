import {
  boundedBody,
  candidateSession,
  candidateFailure,
  CandidateError,
  privateHeaders,
} from "@/lib/candidate-server";
import { boundedCvText, parseCv } from "@/lib/cv-parser";
import {
  extractProfile,
  extractionConfig,
  maximumExtractionCost,
  EXTRACTION_VERSION,
} from "@/lib/cv-extraction";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { db } = await candidateSession(request),
      config = extractionConfig();
    if (!config)
      throw new CandidateError(
        "L'import assisté est en préparation. Vous pouvez déjà remplir votre profil manuellement.",
        503,
      );
    if (request.headers.get("x-cv-consent") !== "accepted")
      throw new CandidateError(
        "Votre accord est nécessaire pour transmettre le texte à Hugging Face.",
      );
    const bytes = await boundedBody(request, 4_100_000);
    const { error } = await db.rpc("reserve_cv_extraction", {
      p_config_version: config.version,
      p_max_cost: maximumExtractionCost(config),
    });
    if (error)
      throw new CandidateError(
        "Import indisponible : quota atteint ou configuration en attente. La saisie manuelle reste disponible.",
        429,
      );
    let text: string;
    try {
      if (
        request.headers.get("content-type")?.includes("multipart/form-data")
      ) {
        const form = await new Response(Buffer.from(bytes), {
          headers: { "content-type": request.headers.get("content-type")! },
        }).formData();
        const file = form.get("file");
        if (!(file instanceof File))
          throw new Error("Sélectionnez un PDF ou DOCX.");
        text = await parseCv(
          new Uint8Array(await file.arrayBuffer()),
          file.name,
        );
      } else {
        text = boundedCvText(
          JSON.parse(Buffer.from(bytes).toString("utf8")).text,
        );
      }
    } catch {
      throw new CandidateError(
        "CV illisible ou trop long. Utilisez un PDF texte ou DOCX de moins de 4 Mo / 30 000 caractères, ou la saisie manuelle.",
      );
    }
    try {
      const profile = await extractProfile(text, config);
      return Response.json(
        {
          profile,
          extractionVersion: EXTRACTION_VERSION,
          needsConfirmation: true,
        },
        { headers: privateHeaders },
      );
    } catch (e) {
      throw new CandidateError(
        e instanceof Error ? e.message : "Extraction indisponible.",
        422,
      );
    }
  } catch (e) {
    return candidateFailure(e);
  }
}
