export const dynamic = "force-dynamic";
export const revalidate = 0;
import Image from "next/image";
import { SearchBlock } from "@/components/SearchBlock";
import SelectedProfilesSection from "@/components/home/SelectedProfilesSection";
import UmbrellaIconsClient from "@/components/home/UmbrellaIconsClient";
import QuikWorkerRegister from "@/components/home/QuikWorkerRegister";

export default function HomePage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params?.lang === "ar" ? "ar" : "fr";
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <section className="rounded-2xl overflow-hidden">
        <Image
          src="/hero-bricole.png"
          alt="bricola.ma"
          width={1200}
          height={360}
          priority
          className="mx-auto rounded-xl shadow-md object-contain w-[85%] max-w-[1000px] h-auto"
          style={{ maxHeight: "220px" }}
        />
      </section>
       <QuikWorkerRegister lang={lang} />
      <SearchBlock />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {lang === "ar" ? "حسب عائلة المهن" : "Par famille de métiers"}
        </h2>
        <UmbrellaIconsClient />
      </section>

      <SelectedProfilesSection lang={lang} />
    </main>
  );
}
