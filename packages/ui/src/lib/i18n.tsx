import { createContext, useContext } from "react";

export type Locale = "ru" | "en";

const strings = {
  ru: {
    close: "Закрыть",
    today: "Сегодня",
    tomorrow: "Завтра",
    nextWeek: "След. неделя",
    noDate: "Без даты",
    previousMonth: "Предыдущий месяц",
    nextMonth: "Следующий месяц",
    pickDate: "Выбрать дату",
    commandPlaceholder: "Поиск команд и документов…",
    commandEmpty: "Ничего не найдено",
    remove: "Убрать",
    loading: "Загрузка",
    taskOpen: "Задача",
    taskDone: "Выполнено",
    taskCancelled: "Отменено",
    notifications: "Уведомления",
    online: "в сети",
    away: "отошёл",
    offline: "не в сети",
  },
  en: {
    close: "Close",
    today: "Today",
    tomorrow: "Tomorrow",
    nextWeek: "Next week",
    noDate: "No date",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    pickDate: "Pick a date",
    commandPlaceholder: "Search commands and documents…",
    commandEmpty: "No results",
    remove: "Remove",
    loading: "Loading",
    taskOpen: "Task",
    taskDone: "Done",
    taskCancelled: "Cancelled",
    notifications: "Notifications",
    online: "online",
    away: "away",
    offline: "offline",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type Strings = { [K in keyof (typeof strings)["ru"]]: string };

export const LocaleContext = createContext<Locale>("ru");

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useStrings(): Strings {
  return strings[useLocale()];
}
