"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface QuickWorkerRegisterProps {
  lang: "fr" | "ar";
}

export default function QuickWorkerRegister({ lang }: QuickWorkerRegisterProps) {
  const { user } = useAuth();

  // Si l'utilisateur est déjà connecté, on n'affiche rien du tout
  if (user) return null;

  const prefix = `/${lang}`;
  const targetPath = `${prefix}/worker/new`;
  
  // On conserve la langue actuelle de l'URL pour la redirection
  const loginUrl = `/${lang}/login?next=${encodeURIComponent(targetPath)}`;

  return (
    <div className="flex justify-center w-full px-4" dir="rtl">
      <Link href={loginUrl} className="w-full max-w-md">
        <Button
          type="button"
          className="w-full py-6 text-lg font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] animate-pulse flex items-center justify-center gap-3"
        >
          <UserPlus className="h-5 w-5" />
          <span>سجل من هنا</span>
        </Button>
      </Link>
    </div>
  );
}