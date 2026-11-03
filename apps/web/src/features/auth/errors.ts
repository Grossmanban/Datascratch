import { ApiError, NetworkError } from "@/api/client";
import { isUnsafeKdf } from "@/auth/kdfBounds";
import i18n from "@/i18n";

export function authErrorMessage(e: unknown, fallbackKey: string): string {
  if (isUnsafeKdf(e)) return i18n.t("auth.unsafeKdf");
  if (e instanceof NetworkError) return i18n.t("auth.serverUnavailable");
  if (e instanceof ApiError) {
    if (e.status === 401 || e.code === "unauthorized") return i18n.t(fallbackKey);
    if (e.code === "conflict") return i18n.t("auth.emailTaken");
    if (e.status >= 500) return i18n.t("auth.serverUnavailable");
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}
