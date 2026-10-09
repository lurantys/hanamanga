import { RouteSkeleton } from "@/components/RouteSkeleton";
import type { Metadata } from "next";
import { Suspense } from "react";
import AccountContent from "./account-content";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { ACCOUNT_MAINTENANCE } from "@/lib/account-status";

export const metadata: Metadata = {
  title: "Account | Hana",
};

export default function AccountPage() {
  if (ACCOUNT_MAINTENANCE) return <AccountUnavailable />;
  return (
    <Suspense fallback={<RouteSkeleton kind="account" />}>
      <AccountContent />
    </Suspense>
  );
}
