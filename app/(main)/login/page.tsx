import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 pb-24 pt-32">
          <div className="h-8 w-40 animate-pulse rounded bg-zinc-800" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
