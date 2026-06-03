import React from "react";
import { createRoot } from "react-dom/client";
import { SharedIntlProvider } from "./i18n";

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
  default?: {
    light?: string;
    [key: string]: string | undefined;
  };
  variants?: {
    [key: string]: {
      urls?: {
        brandOverride?: string;
      };
    };
  };
}

interface StylePayload {
  mfe_config_api?: string;
  style_urls?: string[];
}

const PARAGON_CORE_CSS = "https://cdn.jsdelivr.net/npm/@openedx/paragon@23/dist/core.min.css";
const PARAGON_LIGHT_CSS = "https://cdn.jsdelivr.net/npm/@openedx/paragon@23/dist/light.min.css";

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
    const variant = themeUrls?.default?.light;
    return [
      themeUrls?.core?.urls?.default || PARAGON_CORE_CSS,
      themeUrls?.core?.urls?.brandOverride,
      PARAGON_LIGHT_CSS,
      variant ? themeUrls?.variants?.[variant]?.urls?.brandOverride : undefined,
    ].filter(Boolean) as string[];
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
  const payload = (data || {}) as StylePayload;
  const styleUrls = payload.style_urls || [];
  if (!payload.mfe_config_api && styleUrls.length === 0) {
    return;
  }

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
