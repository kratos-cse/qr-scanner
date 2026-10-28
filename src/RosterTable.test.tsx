import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RosterTable from "./RosterTable";

const members = [
  { team_member_id: "1", name: "Ada", role: "Leader", checked_in: true },
  { team_member_id: "2", name: "Bea", role: "Member", checked_in: false },
];

describe("RosterTable", () => {
  it("toggles present and absent members independently", () => {
    const onToggle = vi.fn();
    render(<RosterTable members={members} pendingId={null} onToggle={onToggle} />);
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes[0].disabled).toBe(false);
    fireEvent.click(boxes[0]);
    expect(onToggle).toHaveBeenCalledWith(members[0], false);
    fireEvent.click(boxes[1]);
    expect(onToggle).toHaveBeenCalledWith(members[1], true);
    expect(screen.queryByText(/phone|email|payment/i)).toBeNull();
  });

  it("shows a pending label and disables edits", () => {
    render(<RosterTable members={members} pendingId="2" onToggle={() => undefined} />);
    expect(screen.getByText("Saving…")).toBeTruthy();
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes[0].disabled).toBe(true);
    expect(boxes[1].disabled).toBe(true);
  });
});
