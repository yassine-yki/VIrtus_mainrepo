import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Virtus — Les opportunités au Maroc, au même endroit",
    template: "%s | Virtus",
  },
  description:
    "Explorez une sélection d’offres d’emploi au Maroc réunies depuis les sites des employeurs. Recherchez par métier, ville et contrat, puis postulez à la source.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <a className="skip-link" href="#main">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
