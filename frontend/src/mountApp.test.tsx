import React from "react";
import { act, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import paragonPkg from "@openedx/paragon/package.json";
import { makeXBlockInitializer, XBlockRuntime } from "./mountApp";

// The loader is exercised only through the public initializer: the mocked seam is the
// HTTP boundary (global fetch / the config response), never our own modules.
const PARAGON_VERSION = paragonPkg.version;
const CDN = `https://cdn.jsdelivr.net/npm/@openedx/paragon@${PARAGON_VERSION}/dist`;
const BLOCK_CSS = "https://example.test/static/branching_xblock.css";
const CONFIG_URL = "/api/mfe_config/v1";

const runtime: XBlockRuntime = { handlerUrl: () => "/handlers/select_choice" };
const App = () => <p>app mounted</p>;
const initializer = makeXBlockInitializer(App, () => ({}));

let fetchMock: jest.Mock<typeof fetch>;

function jsonResponse(body: unknown): Response {
  return { json: async () => body } as Response;
}

function styleLinks(): (string | null)[] {
  return Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')).map(
    (link) => link.getAttribute("href"),
  );
}

async function mount(data: unknown): Promise<HTMLElement> {
  const element = document.createElement("div");
  element.innerHTML = '<div data-react-root="true"></div>';
  document.body.appendChild(element);

  await act(async () => {
    initializer(runtime, element, data);
  });

  // Also proves the app still mounts in every failure case.
  await within(element).findByText("app mounted");
  return element;
}

function themedConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    core: {
      urls: {
        default: `${CDN}/core.min.css`,
        brandOverride: "https://example.test/theme/core.brand.min.css",
      },
    },
    defaults: { light: "wgu-light" },
    variants: {
      "wgu-light": {
        urls: {
          default: `${CDN}/light.min.css`,
          brandOverride: "https://example.test/theme/light.brand.min.css",
        },
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  fetchMock = jest.fn<typeof fetch>();
  global.fetch = fetchMock;
});

describe("makeXBlockInitializer theme loading", () => {
  it("uses the installed Paragon version and does not fetch without a config API", async () => {
    await mount({ style_urls: [BLOCK_CSS] });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(styleLinks()).toEqual([`${CDN}/core.min.css`, `${CDN}/light.min.css`, BLOCK_CSS]);
  });

  it("resolves the variant from defaults and substitutes every $paragonVersion occurrence", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        PARAGON_THEME_URLS: themedConfig({
          core: {
            urls: {
              default: "https://example.test/theme/paragon@$paragonVersion/core-$paragonVersion.min.css",
              brandOverride: "https://example.test/theme/core.brand.min.css",
            },
          },
          variants: {
            "wgu-light": {
              urls: {
                default: "https://example.test/theme/paragon@$paragonVersion/light.min.css",
                brandOverride: "https://example.test/theme/light.brand.min.css",
              },
            },
          },
        }),
      }),
    );

    await mount({ mfe_config_api: CONFIG_URL, style_urls: [BLOCK_CSS] });

    expect(fetchMock).toHaveBeenCalledWith(CONFIG_URL);
    expect(styleLinks()).toEqual([
      `https://example.test/theme/paragon@${PARAGON_VERSION}/core-${PARAGON_VERSION}.min.css`,
      "https://example.test/theme/core.brand.min.css",
      `https://example.test/theme/paragon@${PARAGON_VERSION}/light.min.css`,
      "https://example.test/theme/light.brand.min.css",
      BLOCK_CSS,
    ]);
    expect(document.head.innerHTML).not.toContain("$paragonVersion");
  });

  it("prefers the canonical defaults key over the legacy singular key", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        PARAGON_THEME_URLS: themedConfig({
          default: { light: "legacy-light" },
          variants: {
            "wgu-light": {
              urls: { default: `${CDN}/light.min.css`, brandOverride: "/theme/variant-default.css" },
            },
            "legacy-light": {
              urls: { default: `${CDN}/light.min.css`, brandOverride: "/theme/variant-legacy.css" },
            },
          },
        }),
      }),
    );

    await mount({ mfe_config_api: CONFIG_URL });

    expect(styleLinks()).toContain("/theme/variant-default.css");
    expect(styleLinks()).not.toContain("/theme/variant-legacy.css");
  });

  it("still honours the legacy singular default key", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        PARAGON_THEME_URLS: {
          default: { light: "legacy-light" },
          variants: {
            "legacy-light": {
              urls: {
                default: "https://example.test/theme/legacy-light.min.css",
                brandOverride: "/theme/variant-legacy.css",
              },
            },
          },
        },
      }),
    );

    await mount({ mfe_config_api: CONFIG_URL });

    expect(styleLinks()).toEqual([
      `${CDN}/core.min.css`,
      "https://example.test/theme/legacy-light.min.css",
      "/theme/variant-legacy.css",
    ]);
  });

  it("fills each missing layer with the installed-version CDN sheet", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        PARAGON_THEME_URLS: {
          core: { urls: {} },
          defaults: { light: "brand-only" },
          variants: { "brand-only": { urls: { brandOverride: "/theme/light.brand.css" } } },
        },
      }),
    );

    await mount({ mfe_config_api: CONFIG_URL, style_urls: [BLOCK_CSS] });

    expect(styleLinks()).toEqual([
      `${CDN}/core.min.css`,
      `${CDN}/light.min.css`,
      "/theme/light.brand.css",
      BLOCK_CSS,
    ]);
  });

  it("falls back to the CDN sheets when PARAGON_THEME_URLS is missing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await mount({ mfe_config_api: CONFIG_URL, style_urls: [BLOCK_CSS] });

    expect(styleLinks()).toEqual([`${CDN}/core.min.css`, `${CDN}/light.min.css`, BLOCK_CSS]);
  });

  it("appends duplicates once, including across re-initialization", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        PARAGON_THEME_URLS: themedConfig({
          core: { urls: { default: `${CDN}/core.min.css`, brandOverride: `${CDN}/core.min.css` } },
          defaults: { light: "duplicate" },
          variants: { duplicate: { urls: { default: `${CDN}/light.min.css` } } },
        }),
      }),
    );

    await mount({ mfe_config_api: CONFIG_URL, style_urls: [BLOCK_CSS] });
    await mount({ mfe_config_api: CONFIG_URL, style_urls: [BLOCK_CSS] });

    expect(styleLinks()).toEqual([`${CDN}/core.min.css`, `${CDN}/light.min.css`, BLOCK_CSS]);
    expect(document.head.querySelectorAll("link").length).toBe(3);
  });

  it("still mounts when the config request is rejected", async () => {
    fetchMock.mockRejectedValueOnce(new Error("config API unavailable"));

    await mount({ mfe_config_api: CONFIG_URL, style_urls: [BLOCK_CSS] });

    expect(styleLinks()).toEqual([`${CDN}/core.min.css`, `${CDN}/light.min.css`, BLOCK_CSS]);
  });

  it("still mounts when the config response is not JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    } as unknown as Response);

    await mount({ mfe_config_api: CONFIG_URL });

    expect(styleLinks()).toEqual([`${CDN}/core.min.css`, `${CDN}/light.min.css`]);
  });

  it("trims padded config URLs and dedupes after trimming and version substitution", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        PARAGON_THEME_URLS: {
          core: {
            urls: {
              default: "  https://example.test/theme/paragon@$paragonVersion/core.min.css  ",
              brandOverride: "https://example.test/theme/paragon@$paragonVersion/core.min.css",
            },
          },
          defaults: { light: "  padded  " },
          variants: {
            padded: {
              urls: {
                // Same as the CDN fallback only after trimming, so the trim is exercised.
                default: ` ${CDN}/light.min.css `,
                brandOverride: " https://example.test/theme/padded/light.brand.css ",
              },
            },
          },
        },
      }),
    );

    await mount({ mfe_config_api: CONFIG_URL });

    expect(styleLinks()).toEqual([
      `https://example.test/theme/paragon@${PARAGON_VERSION}/core.min.css`,
      `${CDN}/light.min.css`,
      "https://example.test/theme/padded/light.brand.css",
    ]);
    expect(styleLinks().every((href) => href !== null && href === href.trim())).toBe(true);
    expect(document.head.querySelectorAll("link").length).toBe(3);
  });

  it("ignores malformed config values instead of linking them or throwing", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        PARAGON_THEME_URLS: {
          core: { urls: { default: 42, brandOverride: ["https://example.test/core.brand.css"] } },
          defaults: "not-an-object",
          variants: {
            light: { urls: { default: {}, brandOverride: null } },
            undefined: { urls: { brandOverride: "https://example.test/never-used.css" } },
          },
        },
      }),
    );

    await mount({ mfe_config_api: CONFIG_URL, style_urls: [BLOCK_CSS] });

    expect(styleLinks()).toEqual([`${CDN}/core.min.css`, `${CDN}/light.min.css`, BLOCK_CSS]);
    expect(styleLinks().every((href) => typeof href === "string")).toBe(true);
  });
});
