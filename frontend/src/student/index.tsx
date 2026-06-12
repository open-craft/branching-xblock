import { makeXBlockInitializer, XBlockRuntime, XBlockElementLike } from "../mountApp";
import { StudentPayload, StudentHandlerUrls, StudentInitialState } from "../apiTypes";
import StudentApp from "./StudentApp";

interface StudentAppProps {
  handlerUrls: StudentHandlerUrls;
  initial_state: StudentInitialState;
}

function propsFactory(runtime: XBlockRuntime, _element: XBlockElementLike, data: unknown): StudentAppProps {
  const payload = data as StudentPayload;
  const handlerUrls: StudentHandlerUrls = {
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
