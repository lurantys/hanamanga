import { Suspense } from "react";
import AccountContent from "./account-content";

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 pb-24 pt-header">
          <div className="h-8 w-32 animate-pulse rounded bg-zinc-800" />
        </main>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
