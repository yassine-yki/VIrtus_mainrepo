import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Virtus — Les opportunités au Maroc, au même endroit",
    template: "%s | Virtus",
  },
  description:
    "Explorez une sélection d’offres d’emploi au Maroc réunies depuis les sites des employeurs. Recherchez par métier, ville et contrat, puis postulez à la source.",
  robots: {
    index:
      process.env.VERCEL_ENV !== "preview" &&
      process.env.PUBLIC_INDEXING_ENABLED === "true",
    follow:
      process.env.VERCEL_ENV !== "preview" &&
      process.env.PUBLIC_INDEXING_ENABLED === "true",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('virtus-theme');document.documentElement.dataset.theme=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
