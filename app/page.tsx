// app/page.tsx
import Image from "next/image";
import { fetchUmbrellas } from "@/services/taxonomies";
import { UmbrellaIcons } from "@/components/UmbrellaIcons";
import { SearchBlock } from "@/components/SearchBlock";
import UserQuickActions from "@/components/UserQuickActions";
import SelectedProfilesSection from "@/components/home/SelectedProfilesSection";

export default async function HomePage() {
  const umbrellas = await fetchUmbrellas();

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Petit header (actions rapides) si connecté */}
      {/*< UserQuickActions >*/}

      {/* HERO */}
      <section className="rounded-2xl overflow-hidden">
        <Image
          src="/hero-bricole.png"
          alt="bricole.ma"
          width={1200}
          height={360}
          priority
          className="mx-auto rounded-xl shadow-md object-contain w-[85%] max-w-[1000px] h-auto"
          style={{ maxHeight: "220px" }}
        />
      </section>

      {/* Recherche */}
      <SearchBlock />

      {/* Umbrella (juste sous la recherche) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Par famille de métiers</h2>
        <UmbrellaIcons umbrellas={umbrellas} />
      </section>

      {/* Profils sélectionnés juste au-dessus du footer global */}
      <SelectedProfilesSection />
    </main>
  );
}
