// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider, useLanguage } from "./LanguageContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function LocaleProbe() {
  const { locale } = useLanguage();
  return <span data-testid="locale">{locale}</span>;
}

describe("LanguageProvider", () => {
  let container: HTMLDivElement;
  let root: Root | null;

  async function renderProvider() {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <LanguageProvider>
          <LocaleProbe />
        </LanguageProvider>,
      );
    });
  }

  function renderedLocale() {
    return container.querySelector('[data-testid="locale"]')?.textContent;
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    window.localStorage.clear();
    document.documentElement.removeAttribute("lang");
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }
    window.localStorage.clear();
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("lang");
  });

  it("defaults first-time visitors to Simplified Chinese", async () => {
    await renderProvider();

    expect(renderedLocale()).toBe("zh-CN");
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(window.localStorage.getItem("paperclip.locale")).toBe("zh-CN");
  });

  it("preserves an existing English preference", async () => {
    window.localStorage.setItem("paperclip.locale", "en");

    await renderProvider();

    expect(renderedLocale()).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });
});
