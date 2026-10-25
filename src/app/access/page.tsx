import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  equalSecret,
  reviewCookieValue,
  reviewEnabled,
} from "@/lib/review-auth";
import { Brand } from "@/components/brand";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
async function unlock(formData: FormData) {
  "use server";
  const token = process.env.VIRTUS_REVIEW_TOKEN ?? "";
  if (
    !reviewEnabled() ||
    !equalSecret(String(formData.get("token") ?? ""), token)
  )
    redirect("/access?error=1");
  (await cookies()).set("virtus_review", reviewCookieValue(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 3600,
  });
  redirect("/");
}
export default async function Access({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main id="main" className="access-page shell">
      <Brand />
      <p className="eyebrow">APERÇU PRIVÉ DU PROJET</p>
      <h1>La suite se prépare ici.</h1>
      <p>
        Cette version de travail utilise des offres réelles, dont les conditions
        de diffusion sont en cours de validation.
      </p>
      <form action={unlock}>
        <label htmlFor="token">Clé d’accès à l’aperçu</label>
        <input
          id="token"
          name="token"
          type="password"
          required
          autoComplete="current-password"
          minLength={48}
        />
        <button type="submit" className="search-button">
          Ouvrir l’aperçu ↗
        </button>
        {error && <p role="alert">Clé incorrecte. Réessayez.</p>}
      </form>
    </main>
  );
}
