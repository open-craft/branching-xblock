/**
 * Nudge the Studio authoring preview to re-measure our content height.
 *
 * This is a no-op in the LMS learner view, which keeps its height synced on its own.
 */
let revision = 0;

export function notifyHostRemeasure(): void {
  if (typeof document === "undefined" || !document.body) {
    return;
  }
  revision += 1;
  document.body.setAttribute("data-bx-content-rev", String(revision));
}
