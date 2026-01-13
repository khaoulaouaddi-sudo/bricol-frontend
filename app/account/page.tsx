import { Suspense } from "react";
import AccountClient from "./AccountClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <AccountClient />
    </Suspense>
  );
}
