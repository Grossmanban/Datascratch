import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { UIProvider } from "../src";
import type { Locale } from "../src";

export function renderUI(ui: ReactElement, { locale = "ru", ...opts }: RenderOptions & { locale?: Locale } = {}) {
  return render(ui, { wrapper: ({ children }) => <UIProvider locale={locale}>{children}</UIProvider>, ...opts });
}
