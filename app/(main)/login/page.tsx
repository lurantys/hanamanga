import { RouteSkeleton } from "@/components/RouteSkeleton";
import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./login-form";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { ACCOUNT_MAINTENANCE } from "@/lib/account-status";

export const metadata: Metadata = {
  title: ACCOUNT_MAINTENANCE ? "Account Revamp | Hana" : "Sign In | Hana",
};

export default function LoginPage() {
  if (ACCOUNT_MAINTENANCE) return <AccountUnavailable />;
  return (
    <Suspense fallback={<RouteSkeleton kind="login" />}>
      <LoginForm />
    </Suspense>
  );
}
