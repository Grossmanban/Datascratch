import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { onSignedOut, restore, useAuth } from "@/auth/session";
import { forgetDecryptedAttachments } from "@/data/attachments";
import { forgetBoxKeys } from "@/data/sharing";
import { stopRuntime } from "@/data/runtime";
import { Splash } from "@/features/shell/Splash";
import { PwaPrompt } from "@/features/shell/PwaPrompt";
import { MotionConfig } from "motion/react";
import { useTranslation } from "react-i18next";
import { ConfirmHost, Toaster, UIProvider } from "@/ui";
import { router } from "./router";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false, networkMode: "always" } },
});

export function App() {
  const status = useAuth((s) => s.status);
  const { i18n } = useTranslation();

  useEffect(() => {
    // Guest links don't need (and shouldn't touch) the signed-in account.
    void restore();
    return onSignedOut(() => {
      stopRuntime();
      forgetDecryptedAttachments();
      forgetBoxKeys();
      queryClient.clear();
      void router.navigate({ to: "/login" });
    });
  }, []);

  useEffect(() => {
    if (status !== "loading") void router.invalidate();
  }, [status]);

  if (status === "loading" && !location.pathname.startsWith("/s/")) return <Splash />;

  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider locale={i18n.language === "en" ? "en" : "ru"}>
        {/* Every motion animation follows the system "reduce motion" setting. */}
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
        </MotionConfig>
        <Toaster />
        <ConfirmHost />
        <PwaPrompt />
      </UIProvider>
    </QueryClientProvider>
  );
}
