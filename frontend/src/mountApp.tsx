import React from "react";
import { createRoot } from "react-dom/client";
import { SharedIntlProvider } from "./i18n";

export interface XBlockRuntime {
  handlerUrl(element: Element | null, handlerName: string, suffix?: string, query?: string): string;
  notify?(name: string, payload?: Record<string, unknown>): void;
}

export function makeXBlockInitializer<P>(
  AppComponent: React.ComponentType<P>,
  propsFactory: (runtime: XBlockRuntime, element: Element, data: unknown) => P,
) {
  return function initializer(runtime: XBlockRuntime, element: Element, data: unknown): void {
    const mountNode = element.querySelector('[data-react-root="true"]') || element;
    const props = propsFactory(runtime, element, data);
    const app = React.createElement(AppComponent as React.ComponentType<any>, props as any);
    createRoot(mountNode).render(
      React.createElement(
        SharedIntlProvider,
        null,
        app,
      ),
    );
  };
}
