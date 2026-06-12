import React from "react";
import Button from "@openedx/paragon/dist/Button";
import { useIntl } from "react-intl";
import { studioMessages } from "../../messages";
import { DraftNode } from "../reducer";
import { ValidationState } from "../reducer";

interface NodeListItemProps {
  node: DraftNode;
  index: number;
  isSelected: boolean;
  isUnlinked: boolean;
  validation: ValidationState;
  onSelect: (nodeId: string) => void;
  onToggleDelete: (nodeId: string) => void;
}

const NodeListItem: React.FC<NodeListItemProps> = ({
  node,
  index,
  isSelected,
  isUnlinked,
  validation,
  onSelect,
  onToggleDelete,
}) => {
  const intl = useIntl();
  const hasErrors = validation.nodeErrorIds.has(node.id);

  return (
    <div
      className={`bx-node-list-item${isSelected ? " is-selected" : ""}${node.pending_delete ? " is-pending-delete" : ""}${hasErrors ? " has-errors" : ""}`}
      data-node-id={node.id}
    >
      <Button
        type="button"
        variant="link"
        className="bx-node-list-item__select"
        data-role="select-node"
        data-node-id={node.id}
        onClick={() => onSelect(node.id)}
      >
        {intl.formatMessage(studioMessages.nodeLabel, { index: index + 1 })}
        {isUnlinked && (
          <span className="bx-node-list-item__meta">
            {" "}
            {intl.formatMessage(studioMessages.unlinkedNode)}
          </span>
        )}
      </Button>
      {hasErrors && (
        <span className="bx-node-list-item__error" aria-label={intl.formatMessage(studioMessages.nodeHasErrors)}>!</span>
      )}
      <Button
        type="button"
        variant="link"
        className={`bx-node-list-item__delete${node.pending_delete ? " is-restore" : ""}`}
        data-role="toggle-delete-node"
        data-node-id={node.id}
        aria-label={node.pending_delete
          ? intl.formatMessage(studioMessages.restoreNode)
          : intl.formatMessage(studioMessages.deleteNode)
        }
        onClick={() => onToggleDelete(node.id)}
      >
        {node.pending_delete ? (
          <span className="fa fa-undo" aria-hidden="true" />
        ) : (
          <span className="fa fa-trash-o" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
};

export default NodeListItem;
