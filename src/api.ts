export type ScannerEvent = { id: string; name: string };
export type ScannerCheckpoint = {
  id: string;
  name: string;
  location?: string | null;
  event_id?: string;
  event_name?: string;
};

export type RosterMember = {
  team_member_id: string;
  name: string;
  role: string;
  checked_in: boolean;
};

export type TeamPanel = {
  team_name: string;
  college_name: string;
  event_name: string;
  checkpoint_name: string;
  checked_in_count: number;
  member_count: number;
  roster: RosterMember[];
};

export type ScanPayload = {
  result: string;
  recorded: boolean;
  duplicate: boolean;
  message: string;
  event_name: string;
  checkpoint_name: string;
  participant_name?: string | null;
  team?: TeamPanel | null;
  capability?: string | null;
};

export type MemberCheckInPayload = {
  team_member_id: string;
  result: string;
  recorded: boolean;
  duplicate: boolean;
  checked_in: boolean;
  message: string;
};

const base = () => (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      body?.error?.message ||
      body?.detail ||
      (res.status === 429 ? "Too many check-in requests. Wait a moment and try again." : "The scanner could not reach the server.");
    throw new Error(typeof message === "string" ? message : "Check-in failed.");
  }
  return (body.data ?? body) as T;
}

export async function fetchEvents(): Promise<ScannerEvent[]> {
  const res = await fetch(`${base()}/scanner/events`);
  return parse(res);
}

export async function fetchCheckpoints(): Promise<ScannerCheckpoint[]> {
  const res = await fetch(`${base()}/scanner/checkpoints`);
  return parse(res);
}

export async function submitScan(token: string, checkpointId: string): Promise<ScanPayload> {
  const res = await fetch(`${base()}/scanner/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, checkpoint_id: checkpointId }),
  });
  return parse(res);
}

export async function checkInMember(capability: string, teamMemberId: string): Promise<MemberCheckInPayload> {
  const res = await fetch(`${base()}/scanner/member-checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capability, team_member_id: teamMemberId }),
  });
  return parse(res);
}
