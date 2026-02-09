// app/layout.tsx
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import Header from "@/components/header";
import Footer from "@/components/footer"; // si absent: commente import + <Footer />
import { headers } from "next/headers";

export const metadata = {
  title: "Bricol",
  description: "Plateforme artisans",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const h = headers();
  const langHeader = h.get("x-bricol-lang");
  const lang = langHeader === "ar" ? "ar" : "fr";
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900">
        <ClientProviders>
          <Header />

          <main className="min-h-screen">{children}</main>

          <Footer />
        </ClientProviders>
      </body>
    </html>
  );
}
