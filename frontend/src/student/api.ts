import { postJson } from "../request";
import { StudentInitialState } from "../apiTypes";

export async function fetchState(url: string): Promise<StudentInitialState> {
  return postJson<StudentInitialState>(url, {});
}

export async function selectChoice(url: string, choiceIndex: number): Promise<StudentInitialState> {
  const result = await postJson<{ success: boolean } & StudentInitialState>(url, {
    choice_index: choiceIndex,
  });
  if (!result.success) {
    throw new Error("Failed to select choice");
  }
  return result;
}

export async function undoChoice(url: string): Promise<StudentInitialState> {
  const result = await postJson<{ success: boolean } & StudentInitialState>(url, {});
  if (!result.success) {
    throw new Error("Failed to undo choice");
  }
  return result;
}

export async function resetActivity(url: string): Promise<StudentInitialState> {
  const result = await postJson<{ success: boolean } & StudentInitialState>(url, {});
  if (!result.success) {
    throw new Error("Failed to reset activity");
  }
  return result;
}
