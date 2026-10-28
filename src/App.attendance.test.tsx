import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCheckpoints, setMemberAttendance, submitScan, type MemberCheckInPayload } from "./api";
import App from "./App";

vi.mock("./api", () => ({
  fetchCheckpoints: vi.fn(),
  submitScan: vi.fn(),
  setMemberAttendance: vi.fn(),
}));

vi.mock("./camera", () => ({
  startQrCamera: vi.fn(),
}));

const roster = [{ team_member_id: "m1", name: "Ada", role: "Leader", checked_in: true }];

describe("scanner attendance popup", () => {
  beforeEach(() => {
    vi.mocked(fetchCheckpoints).mockResolvedValue([{ id: "cp-1", name: "Main gate", location: "North" }]);
    vi.mocked(submitScan).mockReset();
    vi.mocked(setMemberAttendance).mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  async function openRoster() {
    render(<App />);
    expect((screen.getByRole("button", { name: "Start scanning" }) as HTMLButtonElement).disabled).toBe(true);
    await screen.findByRole("option", { name: "Main gate" });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cp-1" } });
    vi.mocked(submitScan).mockResolvedValue({
      result: "SUCCESS",
      recorded: true,
      duplicate: false,
      message: "Checked in",
      event_name: "Hack",
      checkpoint_name: "Main gate",
      capability: "cap-token-value",
      team: {
        team_name: "Ada",
        college_name: "ACE",
        event_name: "Hack",
        checkpoint_name: "Main gate",
        checked_in_count: 1,
        member_count: 1,
        roster,
      },
    });
    fireEvent.change(screen.getByPlaceholderText(/paste the token/i), { target: { value: "raw-token" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit token" }));
    await screen.findByRole("dialog");
  }

  it("confirms an uncheck, restores the box when the save fails, and ignores scans while open", async () => {
    await openRoster();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/Mark this member absent/));
    expect(setMemberAttendance).not.toHaveBeenCalled();
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);

    vi.mocked(window.confirm).mockReturnValueOnce(true);
    vi.mocked(setMemberAttendance).mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(screen.getByText("offline")).toBeTruthy());
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    expect(setMemberAttendance).toHaveBeenCalledWith("cap-token-value", "m1", false);

    fireEvent.click(screen.getByRole("button", { name: "Submit token" }));
    expect(submitScan).toHaveBeenCalledTimes(1);
  });

  it("keeps Scan next disabled until the absence save finishes", async () => {
    let resolveSave: (value: MemberCheckInPayload | PromiseLike<MemberCheckInPayload>) => void = () => undefined;
    vi.mocked(setMemberAttendance).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    await openRoster();
    fireEvent.click(screen.getByRole("checkbox"));
    expect((screen.getByRole("button", { name: "Scan next" }) as HTMLButtonElement).disabled).toBe(true);
    resolveSave({
      team_member_id: "m1",
      result: "ABSENT",
      recorded: false,
      duplicate: false,
      checked_in: false,
      message: "Marked absent.",
    });
    await waitFor(() => expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false));
    expect((screen.getByRole("button", { name: "Scan next" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
