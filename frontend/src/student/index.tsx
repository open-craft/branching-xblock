import { makeXBlockInitializer, XBlockRuntime } from "../mountApp";
import { StudentPayload, StudentHandlerUrls } from "../apiTypes";
import StudentApp from "./StudentApp";

interface StudentAppProps {
  handlerUrls: StudentHandlerUrls;
  initial_state: StudentPayload["initial_state"];
}

function propsFactory(runtime: XBlockRuntime, _element: Element, data: unknown): StudentAppProps {
  const payload = data as StudentPayload;
  const handlerUrls: StudentHandlerUrls = {
    get_current_state: payload.handler_urls?.get_current_state
      || runtime.handlerUrl(_element, "get_current_state"),
    select_choice: payload.handler_urls?.select_choice
      || runtime.handlerUrl(_element, "select_choice"),
    undo_choice: payload.handler_urls?.undo_choice
      || runtime.handlerUrl(_element, "undo_choice"),
    reset_activity: payload.handler_urls?.reset_activity
      || runtime.handlerUrl(_element, "reset_activity"),
  };
  return {
    handlerUrls,
    initial_state: payload.initial_state,
  };
}

export const BranchingXBlock = makeXBlockInitializer(StudentApp, propsFactory);

(window as unknown as Record<string, unknown>).BranchingXBlock = BranchingXBlock;
