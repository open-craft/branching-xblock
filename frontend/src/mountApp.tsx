import React from "react";
import { createRoot } from "react-dom/client";
import paragonPkg from "@openedx/paragon/package.json";
import { SharedIntlProvider } from "./i18n";

const PARAGON_VERSION = paragonPkg.version;

export type XBlockElementLike = Element | { 0?: Element; length?: number; jquery?: string };

export interface XBlockRuntime {
  handlerUrl(element: XBlockElementLike | null, handlerName: string, suffix?: string, query?: string): string;
  notify?(name: string, payload?: Record<string, unknown>): void;
}

interface ThemeUrls {
  core?: {
    urls?: {
      default?: string;
      brandOverride?: string;
    };
  };
  /** Canonical platform key: { light: "<variant name>", ... }. */
  defaults?: {
    light?: string;
    [key: string]: string | undefined;
  };
  /** Legacy singular key, kept as an alias for older configs. */
  default?: {
    light?: string;
    [key: string]: string | undefined;
  };
  variants?: {
    [key: string]: {
      urls?: {
        default?: string;
        brandOverride?: string;
      };
    };
  };
}

export interface XBlockPayloadBase {
  mfe_config_api?: string;
  style_urls?: string[];
}

const PARAGON_CORE_CSS = `https://cdn.jsdelivr.net/npm/@openedx/paragon@${PARAGON_VERSION}/dist/core.min.css`;
const PARAGON_LIGHT_CSS = `https://cdn.jsdelivr.net/npm/@openedx/paragon@${PARAGON_VERSION}/dist/light.min.css`;

/** Config values come from a remote JSON document, so only real strings are usable. */
function asUrl(value: unknown): string | undefined {
  // Trimmed here, so whitespace-padded config values still dedupe after substitution.
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function withParagonVersion(url: string): string {
  // A regex, not replaceAll, so there is no ES2021 runtime dependency.
  return url.replace(/\$paragonVersion/g, PARAGON_VERSION);
}

function toDomElement(element: XBlockElementLike): Element {
  if (element instanceof Element) {
    return element;
  }

  if (element && element[0] instanceof Element) {
    return element[0];
  }

  throw new Error("XBlock initializer received an unsupported root element.");
}

async function getParagonStyles(mfeConfigApi?: string): Promise<string[]> {
  if (!mfeConfigApi) {
    return [PARAGON_CORE_CSS, PARAGON_LIGHT_CSS];
  }

  try {
    const response = await fetch(mfeConfigApi);
    const mfeConfig = await response.json();
    const themeUrls = mfeConfig.PARAGON_THEME_URLS as ThemeUrls | undefined;
    // The platform writes "defaults"; the singular key is a legacy alias.
    const variant =
      asUrl(themeUrls?.defaults?.light) ?? asUrl(themeUrls?.default?.light);
    const variantUrls = variant ? themeUrls?.variants?.[variant]?.urls : undefined;

    return [
      asUrl(themeUrls?.core?.urls?.default) ?? PARAGON_CORE_CSS,
      asUrl(themeUrls?.core?.urls?.brandOverride),
      asUrl(variantUrls?.default) ?? PARAGON_LIGHT_CSS,
      asUrl(variantUrls?.brandOverride),
    ]
      .filter((url): url is string => Boolean(url))
      .map(withParagonVersion)
      .filter((url, index, all) => all.indexOf(url) === index);
  } catch (error) {
    // Keep Studio usable if the host platform does not expose the MFE config API.
    return [PARAGON_CORE_CSS, PARAGON_LIGHT_CSS];
  }
}

function appendStylesheet(url: string): void {
  if (document.head.querySelector(`link[href="${url}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

async function loadStyles(data: unknown): Promise<void> {
  const payload = (data || {}) as XBlockPayloadBase;
  const styleUrls = payload.style_urls || [];

  const paragonStyleUrls = await getParagonStyles(payload.mfe_config_api);

  [...paragonStyleUrls, ...styleUrls].forEach(appendStylesheet);
}

export function makeXBlockInitializer<P>(
  AppComponent: React.ComponentType<P>,
  propsFactory: (runtime: XBlockRuntime, element: XBlockElementLike, data: unknown) => P,
) {
  return function initializer(runtime: XBlockRuntime, element: XBlockElementLike, data: unknown): void {
    const el = toDomElement(element);
    const mountNode = el.querySelector('[data-react-root="true"]') || el;
    const props = propsFactory(runtime, element, data);
    const app = React.createElement(AppComponent as React.ComponentType<any>, props as any);
    void loadStyles(data).finally(() => {
      createRoot(mountNode).render(
        React.createElement(
          SharedIntlProvider,
          null,
          app,
        ),
      );
    });
  };
}
