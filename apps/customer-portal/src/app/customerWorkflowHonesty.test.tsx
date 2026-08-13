import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiRequest } from "../lib/api";
import AccountPage from "./account/page";
import MessagesPage from "./messages/page";
import OrdersPage from "./orders/page";

jest.mock("../components/DashboardLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

jest.mock("./AuthContext", () => ({
  useAuth: () => ({ token: "customer-test-token", user: null }),
}));

jest.mock("../lib/api", () => ({
  apiRequest: jest.fn(),
}));

const apiMock = apiRequest as unknown as jest.Mock;

describe("customer workflow honesty", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  it("uses the persisted MFA/device state and revokes a device through the IAM endpoint", async () => {
    apiMock
      .mockResolvedValueOnce({
        email: "customer@example.com",
        mfaEnabled: false,
        connectedDevices: [{
          id: "device-1",
          name: "Work browser",
          manufacturer: null,
          osVersion: null,
          ipAddress: null,
          lastActive: "2026-08-11T08:30:00.000Z",
          current: false,
        }],
      })
      .mockResolvedValueOnce({ message: "Device revoked by the server." });

    const user = userEvent.setup();
    render(<AccountPage />);

    expect(await screen.findByText("Disabled")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage Password & Sessions" })).toHaveAttribute("href", "/settings/security");

    await user.click(screen.getByRole("button", { name: "Remove Work browser" }));

    expect(apiMock).toHaveBeenLastCalledWith("/api/v1/iam/devices/device-1", "customer-test-token", { method: "DELETE" });
    expect(await screen.findByRole("status")).toHaveTextContent("Device revoked by the server.");
    expect(screen.queryByText("Work browser")).not.toBeInTheDocument();
  });

  it("keeps invoice download disabled when the order contract has no invoice URL", async () => {
    apiMock.mockResolvedValueOnce({
      orders: [{
        id: "order-1",
        orderNumber: "ORD-REAL-1",
        description: "Persisted order",
        status: "ACTIVE",
        total: 125,
        currency: "USD",
        billingCycle: "MONTHLY",
        createdAt: "2026-08-11T08:30:00.000Z",
      }],
    });

    render(<OrdersPage />);

    expect(await screen.findByText("ORD-REAL-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invoice unavailable" })).toBeDisabled();
  });

  it("locks duplicate live-chat sends and announces success only after the API resolves", async () => {
    let resolveSend!: (message: Record<string, string>) => void;
    const sendRequest = new Promise<Record<string, string>>((resolve) => {
      resolveSend = resolve;
    });
    apiMock
      .mockResolvedValueOnce({ messages: [] })
      .mockReturnValueOnce(sendRequest);

    const user = userEvent.setup();
    render(<MessagesPage />);

    expect(await screen.findByText("No live-chat messages")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Live-chat message" }), "Please help");
    const sendButton = screen.getByRole("button", { name: "Send" });
    await user.click(sendButton);
    await user.click(sendButton);

    expect(sendButton).toBeDisabled();
    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(apiMock).toHaveBeenLastCalledWith("/api/v1/customer/messages", "customer-test-token", {
      method: "POST",
      body: JSON.stringify({ content: "Please help", channel: "LIVE_CHAT" }),
    });
    expect(screen.queryByText("Message sent through live chat.")).not.toBeInTheDocument();

    resolveSend({
      id: "message-1",
      sender: "CUSTOMER",
      channel: "LIVE_CHAT",
      content: "Please help",
      timestamp: "2026-08-11T08:30:00.000Z",
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Message sent through live chat.");
    expect(screen.getByText("Please help")).toBeInTheDocument();
  });
});
