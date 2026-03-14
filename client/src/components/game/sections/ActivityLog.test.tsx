import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityLog } from "./ActivityLog";

describe("ActivityLog", () => {
  it("renders the Activity Log accordion trigger", () => {
    render(<ActivityLog log={["test entry"]} />);
    expect(screen.getByText("Activity Log")).toBeInTheDocument();
  });

  it("shows log entries after expanding accordion", async () => {
    const user = userEvent.setup();
    render(<ActivityLog log={["Entered gate", "Defeated boss", "Got loot"]} />);

    await user.click(screen.getByText("Activity Log"));

    expect(screen.getByText("• Entered gate")).toBeInTheDocument();
    expect(screen.getByText("• Defeated boss")).toBeInTheDocument();
    expect(screen.getByText("• Got loot")).toBeInTheDocument();
  });

  it("renders empty log without crashing", async () => {
    const user = userEvent.setup();
    render(<ActivityLog log={[]} />);
    await user.click(screen.getByText("Activity Log"));
    // Should not crash
    expect(screen.getByText("Activity Log")).toBeInTheDocument();
  });
});
