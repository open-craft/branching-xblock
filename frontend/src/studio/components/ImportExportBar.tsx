import React from "react";

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
      <button type="button" className="bx-btn bx-btn--outlined" data-role="import-nodes" onClick={onImport}>
        <span className="fa fa-upload" /> Import Nodes as JSON
      </button>
      <button
        type="button"
        className="bx-btn bx-btn--outlined"
        data-role="export-nodes"
        disabled={!savedNodesExist}
        onClick={onExport}
      >
        <span className="fa fa-download" /> Export Nodes
      </button>
    </div>
    <a href="#" className="bx-import-export-bar-template-link" data-role="download-template" onClick={onDownloadTemplate}>
      <span className="fa fa-download" /> Download JSON template
    </a>
  </div>
);

export default ImportExportBar;
