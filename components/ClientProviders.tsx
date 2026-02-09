"use client";

import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { LangProvider } from "@/components/LangProvider";
import LangHtmlSync from "@/components/LangHtmlSync";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LangProvider>
        <LangHtmlSync />
        {children}
      </LangProvider>
    </AuthProvider>
  );
}
