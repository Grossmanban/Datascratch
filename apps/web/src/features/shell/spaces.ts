import type { TFunction } from "i18next";
import { createNotebook, createSpace } from "@/domain/actions";
import { setActiveSpace } from "@/domain/workspace";

const SPACE_ICONS = ["💼", "🎓", "🏡", "🧪", "🎨", "🌱"];

export async function createSpaceInteractive(t: TFunction) {
  const icon = SPACE_ICONS[Math.floor(Math.random() * SPACE_ICONS.length)]!;
  const id = createSpace({ name: t("space.newName"), icon });
  await createNotebook({ spaceId: id, name: t("notebook.newName"), icon: "📓" });
  setActiveSpace(id);
  return id;
}
