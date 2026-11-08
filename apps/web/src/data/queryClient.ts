import { QueryClient } from "@tanstack/react-query";

/** The app's one query cache: the runtime invalidates lists in it when the server says the account changed. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false, networkMode: "always" } },
});
