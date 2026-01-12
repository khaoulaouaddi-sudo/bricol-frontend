// app/layout.tsx
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import Header from "@/components/header";
import Footer from "@/components/footer"; // ⚠️ si tu n'as pas encore de footer.tsx, commente cette ligne + <Footer />

export const metadata = {
  title: "Bricol",
  description: "Plateforme artisans",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900">
        <ClientProviders>
          {/* Header global avec logique de rôles */}
          <Header />

          {/* Contenu des pages */}
          <main className="min-h-screen">
            {children}
          </main>

          {/* Footer global */}
          <Footer />
        </ClientProviders>
      </body>
    </html>
  );
}
