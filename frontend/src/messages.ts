import { defineMessages } from "react-intl";

export const studentMessages = defineMessages({
  loading: {
    id: "branching.student.loading",
    defaultMessage: "Loading...",
  },
  noContent: {
    id: "branching.student.noContent",
    defaultMessage: "No content available.",
  },
  errorSelectingChoice: {
    id: "branching.student.errorSelectingChoice",
    defaultMessage: "Failed to select choice",
  },
  errorUndoChoice: {
    id: "branching.student.errorUndoChoice",
    defaultMessage: "Failed to undo choice",
  },
  errorResetActivity: {
    id: "branching.student.errorResetActivity",
    defaultMessage: "Failed to reset activity",
  },
  scoreDisplay: {
    id: "branching.student.scoreDisplay",
    defaultMessage: "Score: {score}/{maxScore}",
  },
  goBack: {
    id: "branching.student.goBack",
    defaultMessage: "Go Back",
  },
  reset: {
    id: "branching.student.reset",
    defaultMessage: "Reset",
  },
  showReport: {
    id: "branching.student.showReport",
    defaultMessage: "Show Report",
  },
  chooseNextStep: {
    id: "branching.student.chooseNextStep",
    defaultMessage: "Choose Next Step:",
  },
  submit: {
    id: "branching.student.submit",
    defaultMessage: "Submit",
  },
  choiceLabel: {
    id: "branching.student.choiceLabel",
    defaultMessage: "Choice {index}",
  },
  showHint: {
    id: "branching.student.showHint",
    defaultMessage: "Show hint",
  },
  hideHint: {
    id: "branching.student.hideHint",
    defaultMessage: "Hide",
  },
  hintPrefix: {
    id: "branching.student.hintPrefix",
    defaultMessage: "Hint:",
  },
  downloadTranscript: {
    id: "branching.student.downloadTranscript",
    defaultMessage: "Download transcript",
  },
  embeddedMedia: {
    id: "branching.student.embeddedMedia",
    defaultMessage: "Embedded media",
  },
  activityComplete: {
    id: "branching.student.activityComplete",
    defaultMessage: "Activity Complete!",
  },
  reportSubtitle: {
    id: "branching.student.reportSubtitle",
    defaultMessage: "Let's take a look at this report below to see how you performed.",
  },
  yourGrade: {
    id: "branching.student.yourGrade",
    defaultMessage: "Your Grade",
  },
  yourScore: {
    id: "branching.student.yourScore",
    defaultMessage: "Your Score",
  },
  highestPossibleScore: {
    id: "branching.student.highestPossibleScore",
    defaultMessage: "Highest Possible Score",
  },
  detailedScore: {
    id: "branching.student.detailedScore",
    defaultMessage: "Detailed Score",
  },
  yourSelections: {
    id: "branching.student.yourSelections",
    defaultMessage: "Your Selections",
  },
  scoreColumn: {
    id: "branching.student.scoreColumn",
    defaultMessage: "Score",
  },
  noScoredSelections: {
    id: "branching.student.noScoredSelections",
    defaultMessage: "No scored selections were recorded for this attempt.",
  },
  untitledChoice: {
    id: "branching.student.untitledChoice",
    defaultMessage: "Untitled choice",
  },
  resetActivity: {
    id: "branching.student.resetActivity",
    defaultMessage: "Reset Activity",
  },
  contentUpdated: {
    id: "branching.student.contentUpdated",
    defaultMessage: "Content updated.",
  },
});

export const studioMessages = defineMessages({
  saveNetworkError: {
    id: "branching.studio.saveNetworkError",
    defaultMessage: "We weren't able to save your selections. Please try again.",
  },
  errorSaving: {
    id: "branching.studio.errorSaving",
    defaultMessage: "Error saving scenario",
  },
  pleaseSelectFile: {
    id: "branching.studio.pleaseSelectFile",
    defaultMessage: "Please select a JSON file.",
  },
  importFailed: {
    id: "branching.studio.importFailed",
    defaultMessage: "Import failed. Please try again.",
  },
  importUnexpectedError: {
    id: "branching.studio.importUnexpectedError",
    defaultMessage: "An unexpected error occurred. Please try again.",
  },
  continue: {
    id: "branching.studio.continue",
    defaultMessage: "Continue",
  },
  saving: {
    id: "branching.studio.saving",
    defaultMessage: "Saving...",
  },
  save: {
    id: "branching.studio.save",
    defaultMessage: "Save",
  },
  back: {
    id: "branching.studio.back",
    defaultMessage: "Back",
  },
  cancel: {
    id: "branching.studio.cancel",
    defaultMessage: "Cancel",
  },
  saveValidationError: {
    id: "branching.studio.saveValidationError",
    defaultMessage: "We weren't able to save your selections. Please fix the errors shown and try again.",
  },
  pendingDeleteSummary: {
    id: "branching.studio.pendingDeleteSummary",
    defaultMessage: "{count} {count, plural, one {node} other {nodes}} will be deleted when you save.",
  },
  addNode: {
    id: "branching.studio.addNode",
    defaultMessage: "+ Add node",
  },
  maxNodes: {
    id: "branching.studio.maxNodes",
    defaultMessage: "Max 30 nodes",
  },
  nodeLabel: {
    id: "branching.studio.nodeLabel",
    defaultMessage: "Node {index}",
  },
  unlinkedNode: {
    id: "branching.studio.unlinkedNode",
    defaultMessage: "(unlinked node)",
  },
  nodeHasErrors: {
    id: "branching.studio.nodeHasErrors",
    defaultMessage: "Node has errors",
  },
  restoreNode: {
    id: "branching.studio.restoreNode",
    defaultMessage: "Restore node",
  },
  deleteNode: {
    id: "branching.studio.deleteNode",
    defaultMessage: "Delete node",
  },
  cannotDeleteNode: {
    id: "branching.studio.cannotDeleteNode",
    defaultMessage: "You can't delete this node",
  },
  pendingDeletion: {
    id: "branching.studio.pendingDeletion",
    defaultMessage: "Pending deletion",
  },
  content: {
    id: "branching.studio.content",
    defaultMessage: "Content",
  },
  media: {
    id: "branching.studio.media",
    defaultMessage: "Media",
  },
  mediaNone: {
    id: "branching.studio.mediaNone",
    defaultMessage: "None",
  },
  mediaImage: {
    id: "branching.studio.mediaImage",
    defaultMessage: "Composite Image (background + characters)",
  },
  mediaSingleImage: {
    id: "branching.studio.mediaSingleImage",
    defaultMessage: "Single image",
  },
  singleImageUrlHelp: {
    id: "branching.studio.singleImageUrlHelp",
    defaultMessage: "A single image shown on its own, centered. It does not use the shared background.",
  },
  mediaVideo: {
    id: "branching.studio.mediaVideo",
    defaultMessage: "Video",
  },
  mediaAudio: {
    id: "branching.studio.mediaAudio",
    defaultMessage: "Audio",
  },
  leftImageUrl: {
    id: "branching.studio.leftImageUrl",
    defaultMessage: "Left image URL",
  },
  leftImageAltText: {
    id: "branching.studio.leftImageAltText",
    defaultMessage: "Left image alt text",
  },
  rightImageUrl: {
    id: "branching.studio.rightImageUrl",
    defaultMessage: "Right image URL",
  },
  rightImageAltText: {
    id: "branching.studio.rightImageAltText",
    defaultMessage: "Right image alt text",
  },
  url: {
    id: "branching.studio.url",
    defaultMessage: "URL",
  },
  urlPlaceholder: {
    id: "branching.studio.urlPlaceholder",
    defaultMessage: "URL",
  },
  altTextPlaceholder: {
    id: "branching.studio.altTextPlaceholder",
    defaultMessage: "Describe the image for screen readers",
  },
  mediaUrlHelp: {
    id: "branching.studio.mediaUrlHelp",
    defaultMessage: "Supports direct media files (.mp4/.webm/.mp3) or links from YouTube, Vimeo, Panopto.",
  },
  transcriptUrl: {
    id: "branching.studio.transcriptUrl",
    defaultMessage: "Transcript URL",
  },
  overlayTextOnImage: {
    id: "branching.studio.overlayTextOnImage",
    defaultMessage: "Overlay text on image",
  },
  overlayTextHelp: {
    id: "branching.studio.overlayTextHelp",
    defaultMessage: "If left unchecked, text will appear outside the image.",
  },
  noBranches: {
    id: "branching.studio.noBranches",
    defaultMessage: "This node has no branches",
  },
  hint: {
    id: "branching.studio.hint",
    defaultMessage: "Hint",
  },
  choices: {
    id: "branching.studio.choices",
    defaultMessage: "Choices",
  },
  choicesHelp: {
    id: "branching.studio.choicesHelp",
    defaultMessage: "When a learner selects a choice, the score assigned to that choice is added to the total score.",
  },
  addChoice: {
    id: "branching.studio.addChoice",
    defaultMessage: "Add Choice",
  },
  choiceText: {
    id: "branching.studio.choiceText",
    defaultMessage: "Choice text",
  },
  choiceTextPlaceholder: {
    id: "branching.studio.choiceTextPlaceholder",
    defaultMessage: "Choice text",
  },
  choiceScore: {
    id: "branching.studio.choiceScore",
    defaultMessage: "Score",
  },
  choiceScoreAriaLabel: {
    id: "branching.studio.choiceScoreAriaLabel",
    defaultMessage: "Choice score",
  },
  choiceDestination: {
    id: "branching.studio.choiceDestination",
    defaultMessage: "Destination*",
  },
  selectNode: {
    id: "branching.studio.selectNode",
    defaultMessage: "Select node",
  },
  deleteChoice: {
    id: "branching.studio.deleteChoice",
    defaultMessage: "Delete choice",
  },
  gradeBoundary: {
    id: "branching.studio.gradeBoundary",
    defaultMessage: "Grade boundary {index}",
  },
  settings: {
    id: "branching.studio.settings",
    defaultMessage: "Settings",
  },
  displayName: {
    id: "branching.studio.displayName",
    defaultMessage: "Display Name",
  },
  enableUndo: {
    id: "branching.studio.enableUndo",
    defaultMessage: "Let learners try the previous node again",
  },
  enableResetActivity: {
    id: "branching.studio.enableResetActivity",
    defaultMessage: "Let learners reset the activity",
  },
  enableScoring: {
    id: "branching.studio.enableScoring",
    defaultMessage: "Include a grade report at the end of the activity",
  },
  specifyGradeRange: {
    id: "branching.studio.specifyGradeRange",
    defaultMessage: "Specify Grade Range",
  },
  gradeRangeHelp: {
    id: "branching.studio.gradeRangeHelp",
    defaultMessage: "Adjust the scale to set percentage ranges for each grade.",
  },
  backgroundImage: {
    id: "branching.studio.backgroundImage",
    defaultMessage: "Background image",
  },
  backgroundImageHelp: {
    id: "branching.studio.backgroundImageHelp",
    defaultMessage: 'This image is the shared backdrop for "Composite Image" nodes. It is not used by single-image, video, or audio nodes.',
  },
  imageUrl: {
    id: "branching.studio.imageUrl",
    defaultMessage: "Image URL",
  },
  altText: {
    id: "branching.studio.altText",
    defaultMessage: "Alt text",
  },
  decorativeImage: {
    id: "branching.studio.decorativeImage",
    defaultMessage: "Decorative image",
  },
  importSuccess: {
    id: "branching.studio.importSuccess",
    defaultMessage: "Nodes Imported Successfully",
  },
  importRefreshMessage: {
    id: "branching.studio.importRefreshMessage",
    defaultMessage: "Refresh the page to continue editing.",
  },
  refreshPage: {
    id: "branching.studio.refreshPage",
    defaultMessage: "Refresh Page",
  },
  importNodes: {
    id: "branching.studio.importNodes",
    defaultMessage: "Import Nodes",
  },
  importWarning: {
    id: "branching.studio.importWarning",
    defaultMessage: "Please note that any existing nodes will be overwritten by the imported nodes. This cannot be undone.",
  },
  uploadJsonFile: {
    id: "branching.studio.uploadJsonFile",
    defaultMessage: "Upload JSON file",
  },
  invalidJsonError: {
    id: "branching.studio.invalidJsonError",
    defaultMessage: "Invalid JSON file. Please check the file format and try again.",
  },
});
