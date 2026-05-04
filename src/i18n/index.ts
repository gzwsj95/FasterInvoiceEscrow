import translations from "./translations.json";

export const languageCodes = ["en", "zh", "es", "pt", "fr", "de", "ja", "ko"] as const;

export type Language = (typeof languageCodes)[number];
export type TranslationCopy = typeof translations.copy.en;
export type StatusKey = keyof typeof translations.statusLabels.en;

type LanguageOption = {
  code: Language;
  label: string;
  htmlLang: string;
};

const languageCodeSet = new Set<string>(languageCodes);

export const languageOptions = translations.languages as readonly LanguageOption[];
export const copy = translations.copy satisfies Record<Language, TranslationCopy>;
export const statusLabels = translations.statusLabels satisfies Record<Language, Record<StatusKey, string>>;

export const isLanguage = (value: string | null): value is Language =>
  Boolean(value && languageCodeSet.has(value));

export const getHtmlLang = (language: Language) =>
  languageOptions.find((option) => option.code === language)?.htmlLang || "en";

export const getStatusLabel = (language: Language, status: string) =>
  statusLabels[language][status as StatusKey] || status;

export const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") return "en";

  const stored = window.localStorage.getItem("fie-language");
  if (isLanguage(stored)) return stored;

  const browserLanguages =
    window.navigator.languages && window.navigator.languages.length > 0
      ? window.navigator.languages
      : [window.navigator.language];

  for (const locale of browserLanguages) {
    const primary = locale.toLowerCase().split("-")[0];
    if (isLanguage(primary)) return primary;
  }

  return "en";
};
