import { saveScenario, exportNodes, importNodes, fetchStudioState } from "../studio/api";
import * as request from "../request";

jest.mock("../request");

const mockPostJson = request.postJson as jest.MockedFunction<typeof request.postJson>;

describe("studio API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("saveScenario", () => {
    it("calls postJson with save payload", async () => {
      mockPostJson.mockResolvedValue({ result: "success" });
      const payload = {
        nodes: [],
        deleted_node_ids: [],
        enable_undo: true,
        enable_scoring: false,
        enable_reset_activity: false,
        display_name: "Test",
        background_image_url: "",
        background_image_alt_text: "",
        background_image_is_decorative: false,
        grade_ranges: [{ label: "Fail", start: 0, end: 49 }],
      };
      const result = await saveScenario("/save", payload);
      expect(mockPostJson).toHaveBeenCalledWith("/save", payload);
      expect(result).toEqual({ result: "success" });
    });

    it("returns error result on validation failure", async () => {
      mockPostJson.mockResolvedValue({
        result: "error",
        message: "Validation errors",
        field_errors: { global_errors: ["At least one node is required"] },
      });
      const result = await saveScenario("/save", {} as any);
      expect(result.result).toBe("error");
    });
  });

  describe("exportNodes", () => {
    it("calls postJson with empty object", async () => {
      mockPostJson.mockResolvedValue({ success: true, nodes: [{ id: "n1" }] });
      const result = await exportNodes("/export");
      expect(mockPostJson).toHaveBeenCalledWith("/export", {});
      expect(result.nodes).toHaveLength(1);
    });
  });

  describe("importNodes", () => {
    it("sends file content to import handler", async () => {
      mockPostJson.mockResolvedValue({ success: true });
      const fileContent = { nodes: [{ id: "imported" }] };
      const result = await importNodes("/import", fileContent);
      expect(mockPostJson).toHaveBeenCalledWith("/import", fileContent);
      expect(result.success).toBe(true);
    });

    it("returns error from server", async () => {
      mockPostJson.mockResolvedValue({ success: false, error: "Invalid format" });
      const result = await importNodes("/import", {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid format");
    });
  });

  describe("fetchStudioState", () => {
    it("calls postJson with empty object", async () => {
      mockPostJson.mockResolvedValue({ nodes: {} } as any);
      await fetchStudioState("/state");
      expect(mockPostJson).toHaveBeenCalledWith("/state", {});
    });
  });
});
