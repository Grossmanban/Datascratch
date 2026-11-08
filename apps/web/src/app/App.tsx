import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { onSignedOut, restore, useAuth } from "@/auth/session";
import { forgetDecryptedAttachments, resetAttachmentUploads } from "@/data/attachments";
import { forgetBoxKeys } from "@/data/sharing";
import { stopRuntime } from "@/data/runtime";
import { Splash } from "@/features/shell/Splash";
import { PwaPrompt } from "@/features/shell/PwaPrompt";
import { MotionConfig } from "motion/react";
import { useTranslation } from "react-i18next";
import { ConfirmHost, Toaster, UIProvider } from "@/ui";
import { startDiagnostics } from "@/features/settings/diagnostics";
import { bootReady } from "./boot";
import { router } from "./router";

import { queryClient } from "@/data/queryClient";

export { queryClient };

export function App() {
  const status = useAuth((s) => s.status);
  const { i18n } = useTranslation();

  useEffect(() => {
    // Recent errors for «Синхронизация и диагностика», from the start of the session.
    startDiagnostics();
    // Guest links don't need (and shouldn't touch) the signed-in account.
    void restore();
    return onSignedOut(() => {
      stopRuntime();
      forgetDecryptedAttachments();
      resetAttachmentUploads();
      forgetBoxKeys();
      queryClient.clear();
      void router.navigate({ to: "/login" });
    });
  }, []);

  useEffect(() => {
    if (status !== "loading") void router.invalidate();
  }, [status]);

  // The session check decides the first screen (sign-in or the app); until then the boot
  // screen stays, so the sign-in screen never flashes for a signed-in user.
  const booting = status === "loading" && !location.pathname.startsWith("/s/");
  useEffect(() => {
    if (!booting) bootReady();
  }, [booting]);

  if (booting) return <Splash />;

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
