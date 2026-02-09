"use client";

import RequireAuth from "@/components/RequireAuth";
import AccountClient from "./AccountClient";

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountClient />
    </RequireAuth>
  );
}
