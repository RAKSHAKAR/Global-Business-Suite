import { render, screen, fireEvent } from "@testing-library/react";
import { SplitPanel } from "../../components/SplitPanel";

describe("SplitPanel", () => {
  it("renders correctly when open", () => {
    render(
      <SplitPanel title="Test Panel" isOpen={true} onClose={() => {}}>
        <div>Panel Content</div>
      </SplitPanel>
    );

    expect(screen.getByText("Test Panel")).toBeInTheDocument();
    expect(screen.getByText("Panel Content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <SplitPanel title="Test Panel" isOpen={false} onClose={() => {}}>
        <div>Panel Content</div>
      </SplitPanel>
    );

    expect(screen.queryByText("Test Panel")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onCloseMock = jest.fn();
    render(
      <SplitPanel title="Test Panel" isOpen={true} onClose={onCloseMock}>
        <div>Panel Content</div>
      </SplitPanel>
    );

    const closeButton = screen.getByTitle("Close panel");
    fireEvent.click(closeButton);
    
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("toggles minimization state when minimize button is clicked", () => {
    render(
      <SplitPanel title="Test Panel" isOpen={true} onClose={() => {}}>
        <div>Panel Content</div>
      </SplitPanel>
    );

    expect(screen.getByText("Panel Content")).toBeInTheDocument();

    const minimizeButton = screen.getByTitle("Minimize");
    fireEvent.click(minimizeButton);

    // After minimizing, content should not be visible
    expect(screen.queryByText("Panel Content")).not.toBeInTheDocument();

    const expandButton = screen.getByTitle("Expand");
    fireEvent.click(expandButton);

    // After expanding, content should be visible again
    expect(screen.getByText("Panel Content")).toBeInTheDocument();
  });
});
