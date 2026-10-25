import { GlobalFonts } from "@napi-rs/canvas";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/** Font families registered for rendering (bundled, so images are identical on every machine). */
export const TEXT_FAMILY = "DS Inter";
export const DISPLAY_FAMILY = "DS Newsreader";

let registered = false;

export function ensureFonts(): void {
  if (registered) return;
  const inter = dirname(require.resolve("@expo-google-fonts/inter/package.json"));
  const newsreader = dirname(require.resolve("@expo-google-fonts/newsreader/package.json"));
  const files: [string, string][] = [
    [join(inter, "400Regular/Inter_400Regular.ttf"), TEXT_FAMILY],
    [join(inter, "700Bold/Inter_700Bold.ttf"), TEXT_FAMILY],
    [join(inter, "400Regular_Italic/Inter_400Regular_Italic.ttf"), TEXT_FAMILY],
    [join(inter, "700Bold_Italic/Inter_700Bold_Italic.ttf"), TEXT_FAMILY],
    [join(newsreader, "600SemiBold/Newsreader_600SemiBold.ttf"), DISPLAY_FAMILY],
  ];
  for (const [path, family] of files) GlobalFonts.registerFromPath(path, family);
  registered = true;
}
