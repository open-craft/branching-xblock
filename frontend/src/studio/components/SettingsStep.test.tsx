import React from "react";
import { render, screen } from "../../test/helpers";
import SettingsStep from "./SettingsStep";

const baseProps = {
  settings: {
    display_name: "Branching activity",
    enable_undo: false,
    enable_scoring: false,
    enable_reset_activity: false,
    background_image_url: "",
    background_image_alt_text: "",
    background_image_is_decorative: false,
    grade_ranges: [
      { label: "Fail", start: 0, end: 49 },
      { label: "Pass", start: 50, end: 100 },
    ],
  },
  validation: {
    settingsFieldErrors: {},
    globalErrors: [],
    nodeErrorIds: new Set<string>(),
    nodeErrorTitles: {},
    nodeErrorDetails: {},
    nodeFieldErrors: {},
  },
  authoringHelpHtml: "",
  onUpdateField: jest.fn(),
};

describe("SettingsStep", () => {
  it("renders authoring help HTML when provided", () => {
    const { container } = render(
      <SettingsStep
        {...baseProps}
        authoringHelpHtml="<p><strong>Help</strong> text</p>"
      />
    );

    expect(container.querySelector("[data-role='authoring-help']")?.textContent).toContain("Help text");
    expect(container.querySelector("[data-role='authoring-help'] strong")?.textContent).toBe("Help");
  });

  it("omits authoring help when empty", () => {
    const { container } = render(<SettingsStep {...baseProps} />);
    expect(container.querySelector("[data-role='authoring-help']")).toBeNull();
  });
});
