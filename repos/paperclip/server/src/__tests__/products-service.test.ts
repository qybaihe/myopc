import { afterEach, describe, expect, it } from "vitest";
import { normalizeBrowserVisibleProductUrl } from "../services/products.ts";

const ORIGINAL_PUBLIC_URL = process.env.PAPERCLIP_PUBLIC_URL;
const ORIGINAL_PRODUCT_SUFFIX = process.env.PAPERCLIP_PRODUCT_PUBLIC_DOMAIN_SUFFIX;
const ORIGINAL_PRODUCT_TEMPLATE = process.env.PAPERCLIP_PRODUCT_PUBLIC_URL_TEMPLATE;

afterEach(() => {
  if (ORIGINAL_PUBLIC_URL === undefined) delete process.env.PAPERCLIP_PUBLIC_URL;
  else process.env.PAPERCLIP_PUBLIC_URL = ORIGINAL_PUBLIC_URL;

  if (ORIGINAL_PRODUCT_SUFFIX === undefined) delete process.env.PAPERCLIP_PRODUCT_PUBLIC_DOMAIN_SUFFIX;
  else process.env.PAPERCLIP_PRODUCT_PUBLIC_DOMAIN_SUFFIX = ORIGINAL_PRODUCT_SUFFIX;

  if (ORIGINAL_PRODUCT_TEMPLATE === undefined) delete process.env.PAPERCLIP_PRODUCT_PUBLIC_URL_TEMPLATE;
  else process.env.PAPERCLIP_PRODUCT_PUBLIC_URL_TEMPLATE = ORIGINAL_PRODUCT_TEMPLATE;
});

describe("product service URL normalization", () => {
  it("rewrites server-local preview URLs to MyOPC product subdomains for hosted deployments", () => {
    process.env.PAPERCLIP_PUBLIC_URL = "https://myopc.me";
    delete process.env.PAPERCLIP_PRODUCT_PUBLIC_DOMAIN_SUFFIX;
    delete process.env.PAPERCLIP_PRODUCT_PUBLIC_URL_TEMPLATE;

    expect(
      normalizeBrowserVisibleProductUrl("http://127.0.0.1:5173", {
        id: "project-id",
        urlKey: "Demo Shop",
      }),
    ).toBe("https://demo-shop.apps.myopc.me");
  });

  it("supports an explicit public product URL template", () => {
    process.env.PAPERCLIP_PRODUCT_PUBLIC_URL_TEMPLATE = "https://{{project}}.preview.myopc.me";

    expect(
      normalizeBrowserVisibleProductUrl("http://localhost:3001", {
        id: "project-id",
        urlKey: "Ops Console",
      }),
    ).toBe("https://ops-console.preview.myopc.me");
  });

  it("keeps already-public runtime URLs unchanged", () => {
    process.env.PAPERCLIP_PUBLIC_URL = "https://myopc.me";

    expect(
      normalizeBrowserVisibleProductUrl("https://demo.example.com", {
        id: "project-id",
        urlKey: "demo",
      }),
    ).toBe("https://demo.example.com");
  });
});
