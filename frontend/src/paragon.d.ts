/*
 * @openedx/paragon@23.22.0 ships no typings for these deep paths: dist/Card/ has no
 * index.d.ts and icons/es5/*.js have none at all. The two declarations below are
 * deliberately bare, so these imports are implicitly any rather than TS7016 errors.
 * Delete each line once upstream ships the matching .d.ts.
 */
declare module "@openedx/paragon/dist/Card";
declare module "@openedx/paragon/icons/es5/*";
