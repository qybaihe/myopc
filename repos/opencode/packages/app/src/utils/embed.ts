import type { ColorScheme } from "@opencode-ai/ui/theme/context"

const EMBED_STORAGE_KEY = "opencode.embed.config"

export type EmbedSource = "paperclip"

export type EmbedConfig = {
  enabled: boolean
  source: EmbedSource | null
  hideSidebar: boolean
  forcedColorScheme: Exclude<ColorScheme, "system"> | null
}

const DEFAULT_EMBED_CONFIG: EmbedConfig = {
  enabled: false,
  source: null,
  hideSidebar: false,
  forcedColorScheme: null,
}

function normalizeTheme(value: string | null): EmbedConfig["forcedColorScheme"] {
  return value === "dark" || value === "light" ? value : null
}

function parseParams(params: URLSearchParams): EmbedConfig {
  const enabled = params.get("paperclip_embed") === "1"
  if (!enabled) return DEFAULT_EMBED_CONFIG

  return {
    enabled: true,
    source: "paperclip",
    hideSidebar: (params.get("paperclip_sidebar") ?? "hidden") === "hidden",
    forcedColorScheme: normalizeTheme(params.get("paperclip_theme")),
  }
}

function readStoredConfig(): EmbedConfig {
  if (typeof window === "undefined") return DEFAULT_EMBED_CONFIG
  try {
    const raw = window.sessionStorage.getItem(EMBED_STORAGE_KEY)
    if (!raw) return DEFAULT_EMBED_CONFIG
    const parsed = JSON.parse(raw) as Partial<EmbedConfig>
    if (!parsed.enabled || parsed.source !== "paperclip") return DEFAULT_EMBED_CONFIG
    return {
      enabled: true,
      source: "paperclip",
      hideSidebar: parsed.hideSidebar !== false,
      forcedColorScheme: parsed.forcedColorScheme === "dark" || parsed.forcedColorScheme === "light"
        ? parsed.forcedColorScheme
        : null,
    }
  } catch {
    return DEFAULT_EMBED_CONFIG
  }
}

function persistConfig(config: EmbedConfig) {
  if (typeof window === "undefined") return
  try {
    if (!config.enabled) {
      window.sessionStorage.removeItem(EMBED_STORAGE_KEY)
      return
    }
    window.sessionStorage.setItem(EMBED_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Ignore storage failures in embedded browsers.
  }
}

export function readEmbedConfig(search: string | URLSearchParams | null | undefined): EmbedConfig {
  const params = search instanceof URLSearchParams
    ? search
    : new URLSearchParams(typeof search === "string" ? search : "")
  const parsed = parseParams(params)
  if (parsed.enabled) {
    persistConfig(parsed)
    return parsed
  }
  return readStoredConfig()
}

export function readWindowEmbedConfig(): EmbedConfig {
  if (typeof window === "undefined") return DEFAULT_EMBED_CONFIG
  return readEmbedConfig(window.location.search)
}
