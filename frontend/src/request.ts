export class RequestError extends Error {
  public status: number;
  public responseBody: unknown;

  constructor(message: string, status: number, responseBody: unknown) {
    super(message);
    Object.setPrototypeOf(this, RequestError.prototype);
    this.name = "RequestError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function getCookie(name: string): string {
  if (document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith(name + "=")) {
        return decodeURIComponent(trimmed.substring(name.length + 1));
      }
    }
  }
  return "";
}

export async function postJson<T>(url: string, payload: unknown = {}): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      throw new RequestError(
        `Request failed with status ${response.status}`,
        response.status,
        null,
      );
    }
    body = {};
  }

  if (!response.ok) {
    throw new RequestError(
      `Request failed with status ${response.status}`,
      response.status,
      body,
    );
  }

  return body as T;
}
