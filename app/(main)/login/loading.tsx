import { RouteSkeleton } from "@/components/RouteSkeleton";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { ACCOUNT_MAINTENANCE } from "@/lib/account-status";

export default function LoginLoading() {
  if (ACCOUNT_MAINTENANCE) return <AccountUnavailable />;
  return <RouteSkeleton kind="login" />;
}
