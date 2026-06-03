import React from "react";
import Button from "@openedx/paragon/dist/Button";

interface ImportExportBarProps {
  savedNodesExist: boolean;
  onImport: () => void;
  onExport: () => void;
  onDownloadTemplate: (e: React.MouseEvent) => void;
}

const ImportExportBar: React.FC<ImportExportBarProps> = ({
  savedNodesExist,
  onImport,
  onExport,
  onDownloadTemplate,
}) => (
  <div className="bx-import-export-bar">
    <div className="bx-import-export-bar-actions">
      <Button type="button" variant="outline-primary" className="bx-btn bx-btn--outlined" data-role="import-nodes" onClick={onImport}>
        <span className="fa fa-upload" /> Import Nodes as JSON
      </Button>
      <Button
        type="button"
        variant="outline-primary"
        className="bx-btn bx-btn--outlined"
        data-role="export-nodes"
        disabled={!savedNodesExist}
        onClick={onExport}
      >
        <span className="fa fa-download" /> Export Nodes
      </Button>
    </div>
    <Button as="a" href="#" variant="link" className="bx-import-export-bar-template-link" data-role="download-template" onClick={onDownloadTemplate}>
      <span className="fa fa-download" /> Download JSON template
    </Button>
  </div>
);

export default ImportExportBar;
