// components/UmbrellaIcons.tsx
"use client";

import { useRouter } from "next/navigation";
import { Umbrella } from "@/types";

// ✅ Icônes lucide
import { Hammer, Sparkles, Scissors, Leaf, Truck } from "lucide-react";

const ICONS_BY_UMBRELLA: Record<string, any> = {
  batiment: Hammer,
  menage_cuisine: Sparkles,
  beaute: Scissors,
  jardinage: Leaf,
  transport: Truck,
};

const BG_BY_UMBRELLA: Record<string, string> = {
  batiment: "bg-orange-50",
  menage_cuisine: "bg-sky-50",
  beaute: "bg-pink-50",
  jardinage: "bg-green-50",
  transport: "bg-indigo-50",
};

const ICON_COLOR_BY_UMBRELLA: Record<string, string> = {
  batiment: "text-orange-600",
  menage_cuisine: "text-sky-600",
  beaute: "text-pink-600",
  jardinage: "text-green-600",
  transport: "text-indigo-600",
};

export function UmbrellaIcons({ umbrellas }: { umbrellas: Umbrella[] }) {
  const router = useRouter();
  const visible = ["batiment", "menage_cuisine", "beaute", "jardinage", "transport"]; // ordre voulu

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {umbrellas
        .filter((u) => visible.includes(u.slug))
        .sort((a, b) => visible.indexOf(a.slug) - visible.indexOf(b.slug))
        .map((u) => {
          const Icon = ICONS_BY_UMBRELLA[u.slug] ?? Hammer;
          const bg = BG_BY_UMBRELLA[u.slug] ?? "bg-white";

          return (
            <button
              key={u.slug}
              onClick={() => router.push(`/results?umbrella=${u.slug}`)}
              className={`rounded-2xl p-4 shadow hover:shadow-md transition border ${bg} text-left`}
              aria-label={u.name}
            >
              <div className="flex items-center gap-3">
               <div className="w-11 h-11 rounded-xl flex items-center justify-center">
                   <Icon className={`w-7 h-7 ${ICON_COLOR_BY_UMBRELLA[u.slug] ?? "text-gray-800"}`} />
             </div>

                <div className="min-w-0">
                  <div className="text-base font-semibold leading-tight">{u.name}</div>
                  <div className="text-sm opacity-70">{u.sectors.length} secteurs</div>
                </div>
              </div>
            </button>
          );
        })}
    </div>
  );
}
