// components/UserQuickActions.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { isAdmin, isCompany, isVisitor, isWorker } from "@/components/roles";
import { useLang } from "@/components/LangProvider";

export default function UserQuickActions() {
  const { user } = useAuth();
  const { lang } = useLang();
  const base = `/${lang}`;
  if (!user) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 mt-4 mb-6">
      <div className="rounded-2xl border bg-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm">
            <span className="font-semibold">Actions rapides</span>
            <span className="text-gray-500"> · {user.name || user.email}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {isVisitor(user.role) && (
              <>
                <CTA href="/worker/new" label="+ Profil ouvrier" base={base} />
                <CTA href="/company/new" label="+ Profil entreprise" base={base} />
                <CTA href="/account?tab=account" label="Mon espace" base={base} />
              </>
            )}

            {isWorker(user.role) && (
              <>
                <CTA href="/worker/new" label="+ Profil ouvrier" base={base} />
                <CTA href="/account?tab=account" label="Gérer mes profils" base={base} />
              </>
            )}

            {isCompany(user.role) && (
              <>
                <CTA href="/account?tab=company" label="Mon entreprise" base={base} />
                <CTA href="/account?tab=account" label="Mon espace" base={base} />
              </>
            )}

            {isAdmin(user.role) && (
              <>
                <CTA href="/admin" label="Espace admin" base={base} />
                <CTA href="/account?tab=account" label="Mon espace" base={base} />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA({ href, label, base }: { href: string; label: string; base: string }) {
  const finalHref = href.startsWith("/") ? `${base}${href}` : href;
  return (
    <Link
      href={finalHref}
      className="inline-block rounded-xl px-3 py-2 text-sm border hover:bg-gray-50"
    >
      {label}
    </Link>
  );
}
