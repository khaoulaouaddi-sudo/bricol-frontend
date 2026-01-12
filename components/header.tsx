"use client";

import Link from "next/link";
import React from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

function buildLoginNext(pathWithQuery: string) {
  return `/login?next=${encodeURIComponent(pathWithQuery)}`;
}

export default function Header() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <header className="w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">Bricole</div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-24 bg-gray-100 rounded-lg" />
              <div className="h-9 w-40 bg-gray-100 rounded-lg" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  // NON CONNECTÉ
  if (!user) {
    return (
      <header className="w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">Bricole</div>

            <nav className="flex items-center gap-3 flex-wrap justify-end">
              <Link href="/history">
                <Button variant="outline" className="rounded-lg bg-transparent">
                  Historique
                </Button>
              </Link>

              <Link href="/login">
                <Button variant="outline" className="rounded-lg bg-transparent">
                  Se connecter
                </Button>
              </Link>

              <Link href={buildLoginNext("/account?tab=account&intent=create-worker")}>
                <Button variant="outline" className="rounded-lg bg-transparent">
                  Créer un profil ouvrier
                </Button>
              </Link>

              <Link href={buildLoginNext("/account?tab=account&intent=create-company")}>
                <Button className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
                  Créer un profil entreprise
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>
    );
  }

  // CONNECTÉ (simplifié)
  const name = user.name || user.email;

  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">Bricole</div>

          <nav className="flex items-center gap-3 flex-wrap justify-end">
            <span className="text-sm text-gray-600 hidden sm:inline">
              Bonjour, <span className="font-semibold">{name}</span>
            </span>

            <Link href="/history">
              <Button variant="outline" className="rounded-lg bg-transparent">
                Historique
              </Button>
            </Link>

            <Link href="/account?tab=account">
              <Button variant="outline" className="rounded-lg bg-transparent">
                Mon espace
              </Button>
            </Link>

            <Button
              onClick={logout}
              variant="outline"
              className="rounded-lg bg-transparent"
            >
              Déconnexion
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
