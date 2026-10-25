/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: "src/stories/**/*.stories.tsx",
  viteConfig: ".ladle/vite.config.ts",
  defaultStory: "overview--showcase",
  addons: {
    theme: { enabled: true, defaultState: "light" },
    rtl: { enabled: false },
    a11y: { enabled: true },
  },
};
