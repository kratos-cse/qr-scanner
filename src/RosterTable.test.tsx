import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RosterTable from "./RosterTable";

const members = [
  { team_member_id: "1", name: "Ada", role: "Leader", checked_in: true },
  { team_member_id: "2", name: "Bea", role: "Member", checked_in: false },
];

describe("RosterTable", () => {
  it("checks in only the clicked member and does not uncheck present rows", () => {
    const onCheckIn = vi.fn();
    render(<RosterTable members={members} pendingId={null} onCheckIn={onCheckIn} />);
    const boxes = screen.getAllByRole("checkbox");
    expect((boxes[0] as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(boxes[0]);
    expect(onCheckIn).not.toHaveBeenCalled();
    fireEvent.click(boxes[1]);
    expect(onCheckIn).toHaveBeenCalledTimes(1);
    expect(onCheckIn.mock.calls[0][0].name).toBe("Bea");
    expect(screen.queryByText(/phone|email|payment/i)).toBeNull();
  });

  it("shows a pending label", () => {
    render(<RosterTable members={members} pendingId="2" onCheckIn={() => undefined} />);
    expect(screen.getByText("Saving…")).toBeTruthy();
  });
});
