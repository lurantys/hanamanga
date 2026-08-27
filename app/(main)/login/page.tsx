import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign In — Hana",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 pb-24 pt-header">
          <div className="h-8 w-32 animate-pulse rounded bg-zinc-800" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
