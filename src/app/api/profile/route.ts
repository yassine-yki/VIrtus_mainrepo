import {
  boundedBody,
  candidateSession,
  candidateFailure,
  CandidateError,
  privateHeaders,
} from "@/lib/candidate-server";
import { validateProfile } from "@/lib/profile";
export async function GET(request: Request) {
  try {
    const { db, user } = await candidateSession(request);
    const { data, error } = await db
      .from("candidate_profiles")
      .select("profile,revision,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return Response.json(
      data
        ? { ...data, profile: validateProfile(data.profile) }
        : { profile: null },
      { headers: privateHeaders },
    );
  } catch (e) {
    return candidateFailure(e);
  }
}
export async function PUT(request: Request) {
  try {
    const { db, user } = await candidateSession(request);
    const bytes = await boundedBody(request, 60000);
    let profile;
    try {
      profile = validateProfile(
        JSON.parse(Buffer.from(bytes).toString("utf8")),
      );
    } catch {
      throw new CandidateError(
        "Profil invalide. Vérifiez les champs et les dates.",
      );
    }
    const { data, error } = await db
      .from("candidate_profiles")
      .upsert({ user_id: user.id, profile }, { onConflict: "user_id" })
      .select("revision,updated_at")
      .single();
    if (error) throw error;
    return Response.json(data, { headers: privateHeaders });
  } catch (e) {
    return candidateFailure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const { db, user } = await candidateSession(request);
    const { error } = await db
      .from("candidate_profiles")
      .delete()
      .eq("user_id", user.id);
    if (error) throw error;
    return Response.json({ deleted: true }, { headers: privateHeaders });
  } catch (e) {
    return candidateFailure(e);
  }
}
