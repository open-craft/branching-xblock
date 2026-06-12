import React from "react";
import { render, screen, fireEvent } from "../../test/helpers";
import ImportModal from "./ImportModal";

describe("ImportModal", () => {
  const baseProps = {
    isOpen: false,
    isLoading: false,
    isSuccess: false,
    error: "",
    hasFile: false,
    onClose: jest.fn(),
    onFileSelected: jest.fn(),
    onFileError: jest.fn(),
    onConfirm: jest.fn(),
    onRefresh: jest.fn(),
  };

  it("renders hidden when not open", () => {
    render(<ImportModal {...baseProps} />);
    expect(document.querySelector("[data-role='import-modal-overlay'][hidden]")).toBeInTheDocument();
  });

  it("renders the import form when open", () => {
    render(<ImportModal {...baseProps} isOpen={true} />);
    expect(screen.getByRole("heading", { name: "Import Nodes" })).toBeInTheDocument();
    expect(screen.getByText(/existing nodes will be overwritten/)).toBeInTheDocument();
  });

  it("disables confirm button when no file selected", () => {
    render(<ImportModal {...baseProps} isOpen={true} />);
    const confirmBtn = screen.getByRole("button", { name: "Import Nodes" });
    expect(confirmBtn).toBeDisabled();
  });

  it("enables confirm button when file is selected", () => {
    render(<ImportModal {...baseProps} isOpen={true} hasFile={true} />);
    const confirmBtn = screen.getByRole("button", { name: "Import Nodes" });
    expect(confirmBtn).toBeEnabled();
  });

  it("shows loading state with spinner", () => {
    render(<ImportModal {...baseProps} isOpen={true} isLoading={true} hasFile={true} />);
    expect(screen.getByRole("heading", { name: "Import Nodes" })).toBeInTheDocument();
    expect(document.querySelector(".bx-spinner")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<ImportModal {...baseProps} isOpen={true} error="Invalid file" />);
    expect(screen.getByText("Invalid file")).toBeInTheDocument();
  });

  it("shows success state", () => {
    render(<ImportModal {...baseProps} isOpen={true} isSuccess={true} />);
    expect(screen.getByText("Nodes Imported Successfully")).toBeInTheDocument();
    expect(screen.getByText("Refresh Page")).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", () => {
    render(<ImportModal {...baseProps} isOpen={true} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it("calls onConfirm when confirm is clicked", () => {
    render(<ImportModal {...baseProps} isOpen={true} hasFile={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Import Nodes" }));
    expect(baseProps.onConfirm).toHaveBeenCalled();
  });

  it("calls onRefresh when refresh is clicked in success state", () => {
    render(<ImportModal {...baseProps} isOpen={true} isSuccess={true} />);
    fireEvent.click(screen.getByText("Refresh Page"));
    expect(baseProps.onRefresh).toHaveBeenCalled();
  });

  it("closes on overlay click", () => {
    render(<ImportModal {...baseProps} isOpen={true} />);
    const overlay = document.querySelector("[data-role='import-modal-overlay']");
    fireEvent.click(overlay!);
    expect(baseProps.onClose).toHaveBeenCalled();
  });
});
