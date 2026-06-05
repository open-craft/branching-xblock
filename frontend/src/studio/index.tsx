import { makeXBlockInitializer, XBlockRuntime, XBlockElementLike } from "../mountApp";
import { StudioPayload, StudioHandlerUrls, StudioInitialState, StudioMeta } from "../apiTypes";
import StudioApp from "./StudioApp";

interface StudioAppProps {
  handlerUrls: StudioHandlerUrls;
  initial_state: StudioInitialState;
  meta: StudioMeta;
  runtime: XBlockRuntime;
}

function propsFactory(runtime: XBlockRuntime, _element: XBlockElementLike, data: unknown): StudioAppProps {
  const payload = data as StudioPayload;
  const handlerUrls: StudioHandlerUrls = {
    studio_submit: payload.handler_urls?.studio_submit
      || runtime.handlerUrl(_element, "studio_submit"),
    export_nodes: payload.handler_urls?.export_nodes
      || runtime.handlerUrl(_element, "export_nodes"),
    import_nodes: payload.handler_urls?.import_nodes
      || runtime.handlerUrl(_element, "import_nodes"),
    get_current_state: payload.handler_urls?.get_current_state
      || runtime.handlerUrl(_element, "get_current_state"),
  };
  return {
    handlerUrls,
    initial_state: payload.initial_state,
    meta: payload.meta,
    runtime,
  };
}

export const BranchingStudioEditor = makeXBlockInitializer(StudioApp, propsFactory);

(window as unknown as Record<string, unknown>).BranchingStudioEditor = BranchingStudioEditor;
