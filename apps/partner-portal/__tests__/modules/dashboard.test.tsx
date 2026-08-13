import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Topbar from "../../app/Topbar";

jest.mock("../../app/AuthContext", () => ({
  useAuth: () => ({ token: "partner-test-token" }),
}));

describe("Partner global command search", () => {
  beforeEach(() => {
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });
  });

  it("opens with Ctrl+K and closes with Escape", async () => {
    render(<Topbar />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog", { name: "Partner global search" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search the partner portal" })).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
