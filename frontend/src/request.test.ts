import { getErrorMessage, RequestError } from "./request";

describe("getErrorMessage", () => {
  it("returns fallback for null error", () => {
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
  });

  it("returns fallback for undefined error", () => {
    expect(getErrorMessage(undefined, "Fallback")).toBe("Fallback");
  });

  it("returns message from RequestError", () => {
    const err = new RequestError("Not found", 404, { message: "" });
    expect(getErrorMessage(err, "Fallback")).toBe("Not found");
  });

  it("returns responseBody.message from RequestError when present", () => {
    const err = new RequestError("Bad request", 400, { message: "Custom error detail" });
    expect(getErrorMessage(err, "Fallback")).toBe("Custom error detail");
  });

  it("returns message from standard Error", () => {
    const err = new Error("Something went wrong");
    expect(getErrorMessage(err, "Fallback")).toBe("Something went wrong");
  });

  it("returns fallback when Error has no message", () => {
    const err = new Error();
    expect(getErrorMessage(err, "Fallback")).toBe("Fallback");
  });

  it("returns string error directly", () => {
    expect(getErrorMessage("Network error", "Fallback")).toBe("Network error");
  });

  it("returns fallback for non-standard error objects", () => {
    expect(getErrorMessage({ foo: "bar" }, "Fallback")).toBe("Fallback");
  });
});
