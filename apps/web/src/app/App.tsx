import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { onSignedOut, restore, useAuth } from "@/auth/session";
import { stopRuntime } from "@/data/runtime";
import { Splash } from "@/features/shell/Splash";
import { PwaPrompt } from "@/features/shell/PwaPrompt";
import { ConfirmHost, Toaster, TooltipProvider } from "@/ui";
import { router } from "./router";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false, networkMode: "always" } },
});

export function App() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    // Guest links don't need (and shouldn't touch) the signed-in account.
    void restore();
    return onSignedOut(() => {
      stopRuntime();
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
      <TooltipProvider delayDuration={500}>
        <RouterProvider router={router} />
        <Toaster />
        <ConfirmHost />
        <PwaPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
