import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/brand";
import { CandidateWorkspace } from "@/components/candidate-workspace";
import { extractionConfig } from "@/lib/cv-extraction";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mon profil et mes correspondances",
  robots: { index: false, follow: false },
};
export default function ProfilePage() {
  if (process.env.CANDIDATE_PROFILES_ENABLED !== "true") notFound();
  const url = process.env.SUPABASE_URL,
    publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  return (
    <>
      <Header />
      <main className="shell profile-page" id="main">
        <p className="eyebrow">VOTRE PROCHAIN DÉFI TECH</p>
        <h1>Votre parcours. Les bonnes opportunités.</h1>
        <p>
          Importez votre CV, confirmez votre profil, puis explorez toutes vos
          correspondances.
        </p>
        {url && publishableKey ? (
          <CandidateWorkspace
            url={url}
            publishableKey={publishableKey}
            passwordSignupReady={
              process.env.CANDIDATE_PASSWORD_AUTH_READY === "true"
            }
            extractionEnabled={Boolean(extractionConfig())}
            privacyUrl={
              process.env.HF_PRIVACY_URL || "https://huggingface.co/privacy"
            }
          />
        ) : (
          <p role="status">
            La connexion est en préparation. Le catalogue tech reste accessible
            sans compte.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
