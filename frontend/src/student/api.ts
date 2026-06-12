import { postJson } from "../request";
import { StudentInitialState } from "../apiTypes";

type ActionResponse = { success: boolean; error?: string } & StudentInitialState;

export async function selectChoice(url: string, choiceIndex: number): Promise<StudentInitialState> {
  const result = await postJson<ActionResponse>(url, { choice_index: choiceIndex });
  if (!result.success) {
    throw new Error(result.error || "Failed to select choice");
  }
  return result;
}

export async function undoChoice(url: string): Promise<StudentInitialState> {
  const result = await postJson<ActionResponse>(url, {});
  if (!result.success) {
    throw new Error(result.error || "Failed to undo choice");
  }
  return result;
}

export async function resetActivity(url: string): Promise<StudentInitialState> {
  const result = await postJson<ActionResponse>(url, {});
  if (!result.success) {
    throw new Error(result.error || "Failed to reset activity");
  }
  return result;
}
