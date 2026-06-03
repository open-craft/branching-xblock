import { fetchState, selectChoice, undoChoice, resetActivity } from "../student/api";
import * as request from "../request";

jest.mock("../request");

const mockPostJson = request.postJson as jest.MockedFunction<typeof request.postJson>;

const mockState = {
  nodes: { "node-1": { id: "node-1", content: "Test", media: { type: "", url: "" }, choices: [], hint: "", left_image_url: "", right_image_url: "", left_image_alt_text: "", right_image_alt_text: "", overlay_text: false, transcript_url: "" } },
  start_node_id: "node-1",
  enable_undo: true,
  enable_scoring: true,
  enable_reset_activity: true,
  background_image_url: "",
  background_image_alt_text: "",
  background_image_is_decorative: false,
  max_score: 100,
  grade_ranges: [],
  display_name: "Test",
  current_node: null,
  history: [],
  score_history: [],
  choice_history: [],
  has_completed: false,
  score: 0,
  grade_report: { score: 0, max_score: 100, percentage: 0, grade_label: "Fail", is_pass_style: false, detailed_scores: [] },
};

describe("student API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetchState calls postJson with empty object", async () => {
    mockPostJson.mockResolvedValue(mockState);
    const result = await fetchState("/handler");
    expect(mockPostJson).toHaveBeenCalledWith("/handler", {});
    expect(result).toEqual(mockState);
  });

  it("selectChoice calls postJson with choice_index", async () => {
    mockPostJson.mockResolvedValue({ success: true, ...mockState });
    const result = await selectChoice("/handler", 2);
    expect(mockPostJson).toHaveBeenCalledWith("/handler", { choice_index: 2 });
    expect(result).toHaveProperty("success", true);
  });

  it("selectChoice throws on failure", async () => {
    mockPostJson.mockResolvedValue({ success: false } as any);
    await expect(selectChoice("/handler", 0)).rejects.toThrow("Failed to select choice");
  });

  it("undoChoice calls postJson with empty object", async () => {
    mockPostJson.mockResolvedValue({ success: true, ...mockState });
    const result = await undoChoice("/handler");
    expect(mockPostJson).toHaveBeenCalledWith("/handler", {});
    expect(result).toHaveProperty("success", true);
  });

  it("undoChoice throws on failure", async () => {
    mockPostJson.mockResolvedValue({ success: false } as any);
    await expect(undoChoice("/handler")).rejects.toThrow("Failed to undo choice");
  });

  it("resetActivity calls postJson with empty object", async () => {
    mockPostJson.mockResolvedValue({ success: true, ...mockState });
    const result = await resetActivity("/handler");
    expect(mockPostJson).toHaveBeenCalledWith("/handler", {});
    expect(result).toHaveProperty("success", true);
  });
});
