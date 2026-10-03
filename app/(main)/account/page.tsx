import { RouteSkeleton } from "@/components/RouteSkeleton";
import type { Metadata } from "next";
import { Suspense } from "react";
import AccountContent from "./account-content";

export const metadata: Metadata = {
  title: "Account | Hana",
};

export default function AccountPage() {
  return (
    <Suspense fallback={<RouteSkeleton kind="account" />}>
      <AccountContent />
    </Suspense>
  );
}
