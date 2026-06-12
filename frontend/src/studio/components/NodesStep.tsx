import React from "react";
import { DraftNode, ValidationState } from "../reducer";
import NodeListSidebar from "./NodeListSidebar";
import NodeEditor from "./NodeEditor";
import ImportExportBar from "./ImportExportBar";

interface NodesStepProps {
  nodes: DraftNode[];
  selectedNodeId: string | null;
  currentNode: DraftNode | null;
  nodeIdx: number;
  validation: ValidationState;
  savedNodesExist: boolean;
  onSelectNode: (nodeId: string) => void;
  onToggleDelete: (nodeId: string) => void;
  onAddNode: () => void;
  onUpdateField: (nodeId: string, field: string, value: unknown) => void;
  onChangeChoice: (nodeId: string, choiceIndex: number, field: string, value: unknown) => void;
  onAddChoice: (nodeId: string) => void;
  onDeleteChoice: (nodeId: string, choiceIndex: number) => void;
  onSetMediaType: (nodeId: string, type: string) => void;
  onImport: () => void;
  onExport: () => void;
  onDownloadTemplate: (e: React.MouseEvent) => void;
}

const NodesStep: React.FC<NodesStepProps> = ({
  nodes,
  selectedNodeId,
  currentNode,
  nodeIdx,
  validation,
  savedNodesExist,
  onSelectNode,
  onToggleDelete,
  onAddNode,
  onUpdateField,
  onChangeChoice,
  onAddChoice,
  onDeleteChoice,
  onSetMediaType,
  onImport,
  onExport,
  onDownloadTemplate,
}) => (
  <div className="bx-wizard bx-nodes-step">
    <NodeListSidebar
      nodes={nodes}
      selectedNodeId={selectedNodeId}
      validation={validation}
      onSelect={onSelectNode}
      onToggleDelete={onToggleDelete}
      onAddNode={onAddNode}
    />

    <div className="bx-nodes-main">
      <ImportExportBar
        savedNodesExist={savedNodesExist}
        onImport={onImport}
        onExport={onExport}
        onDownloadTemplate={onDownloadTemplate}
      />
      <div className="bx-node-editor" data-role="node-editor">
        {currentNode && nodeIdx >= 0 ? (
          <NodeEditor
            node={currentNode}
            index={nodeIdx}
            allNodes={nodes}
            validation={validation}
            onUpdateField={onUpdateField}
            onChangeChoice={onChangeChoice}
            onAddChoice={onAddChoice}
            onDeleteChoice={onDeleteChoice}
            onSetMediaType={onSetMediaType}
          />
        ) : null}
      </div>
    </div>
  </div>
);

export default NodesStep;
