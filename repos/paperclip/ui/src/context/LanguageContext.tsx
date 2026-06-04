import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import zhCN from "@/i18n/zh-CN";

export type AppLocale = "en" | "zh-CN";

type TranslateParams = Record<string, string | number | boolean | null | undefined>;

interface LanguageContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: TranslateParams) => string;
  locales: Array<{ value: AppLocale; label: string }>;
}

const STORAGE_KEY = "paperclip.locale";
const DEFAULT_LOCALE: AppLocale = "zh-CN";
const DEFAULT_LOCALES: Array<{ value: AppLocale; label: string }> = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
];

const BRANDED_ATTRIBUTES = ["aria-label", "title", "placeholder", "alt"];

function applyMyOpcBranding(value: string) {
  return value
    .replace(/\bPaperclip Labs\b/g, "MyOPC Labs")
    .replace(/\bPaperclip\b/g, "MyOPC")
    .replace(/\bOpen Code\b/g, "MyOPC Code Engine")
    .replace(/\bOpenCode\b/g, "MyOPC Code Engine")
    .replace(/\bCodex CLI\b/g, "MyOPC Code Engine")
    .replace(/\bCodex Fast\b/g, "MyOPC fast lane")
    .replace(/\bCodex\b/g, "MyOPC Code Engine")
    .replace(/\bGPT-5\.4\b/g, "MiniMax M3");
}

function applyBrandingToDomNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const current = node.nodeValue ?? "";
    const next = applyMyOpcBranding(current);
    if (next !== current) node.nodeValue = next;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;
  if (element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName === "script" || tagName === "style") return;
    for (const attribute of BRANDED_ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const next = applyMyOpcBranding(current);
      if (next !== current) element.setAttribute(attribute, next);
    }
  }

  for (const child of Array.from(node.childNodes)) {
    applyBrandingToDomNode(child);
  }
}

function interpolate(template: string, params?: TranslateParams) {
  if (!params) return template;
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function normalizeLocale(value: string | null | undefined): AppLocale {
  return value === "en" ? "en" : DEFAULT_LOCALE;
}

function detectLocale(): AppLocale {
  return DEFAULT_LOCALE;
}

function readStoredLocale(): AppLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const storedLocale = window.localStorage.getItem(STORAGE_KEY);
    return storedLocale ? normalizeLocale(storedLocale) : null;
  } catch {
    return null;
  }
}

const dictionaries: Record<AppLocale, Record<string, string>> = {
  en: {},
  "zh-CN": zhCN,
};

const defaultValue: LanguageContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key, params) => applyMyOpcBranding(interpolate(key, params)),
  locales: DEFAULT_LOCALES,
};

const LanguageContext = createContext<LanguageContextValue>(defaultValue);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale() ?? detectLocale());

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(normalizeLocale(nextLocale));
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        // Ignore storage failures in restricted environments.
      }
    }
  }, [locale]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined" || !document.body) return;

    applyBrandingToDomNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          applyBrandingToDomNode(mutation.target);
          continue;
        }
        if (mutation.type === "attributes") {
          applyBrandingToDomNode(mutation.target);
          continue;
        }
        for (const addedNode of Array.from(mutation.addedNodes)) {
          applyBrandingToDomNode(addedNode);
        }
      }
    });
    observer.observe(document.body, {
      attributeFilter: BRANDED_ATTRIBUTES,
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [locale]);

  const t = useCallback((key: string, params?: TranslateParams) => {
    const template = dictionaries[locale][key] ?? key;
    return applyMyOpcBranding(interpolate(template, params));
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      locales: DEFAULT_LOCALES,
    }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
