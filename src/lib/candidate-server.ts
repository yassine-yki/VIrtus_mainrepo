import "server-only";
import { createClient } from "@supabase/supabase-js";
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  Vary: "Authorization",
};
export class CandidateError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function candidateSession(request: Request) {
  if (process.env.CANDIDATE_PROFILES_ENABLED !== "true")
    throw new CandidateError("Fonctionnalité non disponible.", 404);
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token || token.length > 16000)
    throw new CandidateError("Connectez-vous pour continuer.", 401);
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new CandidateError("Connexion indisponible.", 503);
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous)
    throw new CandidateError("Votre session a expiré. Reconnectez-vous.", 401);
  return { db, user: data.user };
}
export async function boundedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new CandidateError("Requête trop volumineuse.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CandidateError("Requête vide.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new CandidateError("Requête trop volumineuse.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export function candidateFailure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof CandidateError
          ? error.message
          : "L'opération a échoué. Réessayez dans quelques instants.",
    },
    {
      status: error instanceof CandidateError ? error.status : 503,
      headers: privateHeaders,
    },
  );
}
