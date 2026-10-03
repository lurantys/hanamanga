import { RouteSkeleton } from "@/components/RouteSkeleton";
import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign In | Hana",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<RouteSkeleton kind="login" />}>
      <LoginForm />
    </Suspense>
  );
}
