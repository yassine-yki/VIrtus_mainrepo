import {
  candidateSession,
  candidateFailure,
  CandidateError,
  privateHeaders,
} from "@/lib/candidate-server";
import { validateProfile } from "@/lib/profile";
import { rankMatches } from "@/lib/matching";
import { techCatalog } from "@/lib/catalog";
export async function GET(request: Request) {
  try {
    const { db, user } = await candidateSession(request);
    const { data, error } = await db
      .from("candidate_profiles")
      .select("profile,revision")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      throw new CandidateError(
        "Confirmez votre profil avant de consulter les correspondances.",
        409,
      );
    const params = new URL(request.url).searchParams,
      days = params.get("days") === "0" ? 0 : 30,
      page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
    const { jobs } = await techCatalog();
    return Response.json(
      {
        ...rankMatches(validateProfile(data.profile), jobs, days, page),
        profileRevision: data.revision,
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return candidateFailure(e);
  }
}
