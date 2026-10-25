import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import ru from "./ru";

export type Lang = "ru" | "en";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("ds.lang");
    if (saved === "ru" || saved === "en") return saved;
  } catch {
    // ignore
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "ru";
  return nav.toLowerCase().startsWith("en") ? "en" : "ru";
}

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en } },
  lng: initialLang(),
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLang(lang: Lang) {
  try {
    localStorage.setItem("ds.lang", lang);
  } catch {
    // ignore
  }
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export const currentLang = (): Lang => (i18n.language === "en" ? "en" : "ru");

export default i18n;
