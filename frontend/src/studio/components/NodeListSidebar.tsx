import React from "react";
import { useIntl } from "react-intl";
import { studioMessages } from "../../messages";
import { DraftNode, ValidationState } from "../reducer";
import NodeListItem from "./NodeListItem";

interface NodeListSidebarProps {
  nodes: DraftNode[];
  selectedNodeId: string | null;
  validation: ValidationState;
  onSelect: (nodeId: string) => void;
  onToggleDelete: (nodeId: string) => void;
  onAddNode: () => void;
}

const NodeListSidebar: React.FC<NodeListSidebarProps> = ({
  nodes,
  selectedNodeId,
  validation,
  onSelect,
  onToggleDelete,
  onAddNode,
}) => {
  const intl = useIntl();
  const activeNodes = nodes.filter((n) => !n.pending_delete);
  const atLimit = activeNodes.length >= 30;

  const incomingReferenceCounts = new Map<string, number>();
  nodes.forEach((node) => incomingReferenceCounts.set(node.id, 0));
  activeNodes.forEach((sourceNode) => {
    (sourceNode.choices || []).forEach((choice) => {
      const target = (choice.target_node_id || "").trim();
      if (!target || !incomingReferenceCounts.has(target)) return;
      incomingReferenceCounts.set(target, (incomingReferenceCounts.get(target) || 0) + 1);
    });
  });

  const nodeList = nodes.map((node, idx) => (
    <NodeListItem
      key={node.id}
      node={node}
      index={idx}
      isSelected={node.id === selectedNodeId}
      isUnlinked={!node.pending_delete && idx > 0 && (incomingReferenceCounts.get(node.id) || 0) === 0}
      validation={validation}
      onSelect={onSelect}
      onToggleDelete={onToggleDelete}
    />
  ));

  return (
    <div className="bx-nodes-sidebar">
      <button type="button" className="bx-btn bx-btn--primary" data-role="add-node" disabled={atLimit} onClick={onAddNode}>
        {intl.formatMessage(studioMessages.addNode)}
      </button>
      <div className="bx-node-limit">
        {intl.formatMessage(studioMessages.maxNodes)}
      </div>
      <div className="bx-node-list" data-role="node-list">
        {nodeList}
      </div>
    </div>
  );
};

export default NodeListSidebar;
