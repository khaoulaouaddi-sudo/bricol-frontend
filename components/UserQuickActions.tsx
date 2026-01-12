// components/UserQuickActions.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { isAdmin, isCompany, isVisitor, isWorker } from "@/components/roles";

export default function UserQuickActions() {
  const { user } = useAuth();
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
                <CTA href="/worker/new" label="+ Profil ouvrier" />
                <CTA href="/company/new" label="+ Profil entreprise" />
                <CTA href="/account?tab=account" label="Mon espace" />
              </>
            )}

            {isWorker(user.role) && (
              <>
                <CTA href="/worker/new" label="+ Profil ouvrier" />
                <CTA href="/account?tab=account" label="Gérer mes profils" />
              </>
            )}

            {isCompany(user.role) && (
              <>
                <CTA href="/account?tab=company" label="Mon entreprise" />
                <CTA href="/account?tab=account" label="Mon espace" />
              </>
            )}

            {isAdmin(user.role) && (
              <>
                <CTA href="/admin" label="Espace admin" />
                <CTA href="/account?tab=account" label="Mon espace" />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-xl px-3 py-2 text-sm border hover:bg-gray-50"
    >
      {label}
    </Link>
  );
}
