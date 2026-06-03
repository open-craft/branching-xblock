import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { SharedIntlProvider } from "../i18n";

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <SharedIntlProvider config={{ defaultLocale: "en", locale: "en" }}>
      {children as ReactElement}
    </SharedIntlProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render };
