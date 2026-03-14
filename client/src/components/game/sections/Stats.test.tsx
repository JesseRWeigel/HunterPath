import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Stats } from "./Stats";

const mockPlayer = {
  stats: { STR: 10, AGI: 8, INT: 12, VIT: 6, LUCK: 5 },
  points: 3,
};

describe("Stats", () => {
  it("renders the Stats accordion trigger", () => {
    render(
      <Stats player={mockPlayer} allocateStatWithFeedback={vi.fn()} />
    );
    expect(screen.getByText("Stats")).toBeInTheDocument();
  });

  it("shows available points badge in trigger", () => {
    render(
      <Stats player={mockPlayer} allocateStatWithFeedback={vi.fn()} />
    );
    expect(screen.getByText("3 Points")).toBeInTheDocument();
  });

  it("hides points badge when 0 points", () => {
    render(
      <Stats player={{ ...mockPlayer, points: 0 }} allocateStatWithFeedback={vi.fn()} />
    );
    expect(screen.queryByText(/Points/)).not.toBeInTheDocument();
  });

  it("shows stat values after expanding", async () => {
    const user = userEvent.setup();
    render(
      <Stats player={mockPlayer} allocateStatWithFeedback={vi.fn()} />
    );
    await user.click(screen.getByText("Stats"));

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows stat labels after expanding", async () => {
    const user = userEvent.setup();
    render(
      <Stats player={mockPlayer} allocateStatWithFeedback={vi.fn()} />
    );
    await user.click(screen.getByText("Stats"));

    expect(screen.getByText("Strength")).toBeInTheDocument();
    expect(screen.getByText("Agility")).toBeInTheDocument();
    expect(screen.getByText("Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Vitality")).toBeInTheDocument();
    expect(screen.getByText("Luck")).toBeInTheDocument();
  });

  it("calls allocateStat when button is clicked", async () => {
    const user = userEvent.setup();
    const allocate = vi.fn();
    render(<Stats player={mockPlayer} allocateStatWithFeedback={allocate} />);
    await user.click(screen.getByText("Stats"));

    // Buttons use role="button" — find all allocate buttons
    const buttons = screen.getAllByRole("button").filter(
      (btn) => !btn.classList.contains("flex") && btn.classList.contains("bg-violet-600")
    );
    expect(buttons.length).toBe(5);

    await user.click(buttons[0]);
    expect(allocate).toHaveBeenCalledWith("STR");
  });

  it("disables allocate buttons when no points available", async () => {
    const user = userEvent.setup();
    const noPoints = { ...mockPlayer, points: 0 };
    render(
      <Stats player={noPoints} allocateStatWithFeedback={vi.fn()} />
    );
    await user.click(screen.getByText("Stats"));

    const buttons = screen.getAllByRole("button").filter(
      (btn) => btn.classList.contains("bg-violet-600")
    );
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("shows stat effect descriptions", async () => {
    const user = userEvent.setup();
    render(
      <Stats player={mockPlayer} allocateStatWithFeedback={vi.fn()} />
    );
    await user.click(screen.getByText("Stats"));

    expect(screen.getByText("Stat Effects")).toBeInTheDocument();
    expect(screen.getByText(/Primary damage/)).toBeInTheDocument();
  });
});
