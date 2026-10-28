import { useEffect, useRef } from "react";
import type { ScanPayload } from "./api";
import RosterTable from "./RosterTable";
import type { RosterMember } from "./api";

type Props = {
  scan: ScanPayload;
  roster: RosterMember[];
  pendingId: string | null;
  error: string | null;
  onToggle: (member: RosterMember, checkedIn: boolean) => void;
  onClose: () => void;
};

export default function ScanResultModal({ scan, roster, pendingId, error, onToggle, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const team = scan.team;
  const present = roster.filter((member) => member.checked_in).length;
  const tone = scan.recorded ? "ok" : scan.duplicate ? "warn" : "bad";

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && pendingId === null) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pendingId]);

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="scan-title">
        <p id="scan-title" className={`result ${tone}`}>{scan.message}</p>
        {team ? (
          <>
            <p><strong>Team:</strong> {team.team_name || "—"}</p>
            <p><strong>College:</strong> {team.college_name || "—"}</p>
            <p><strong>Event:</strong> {team.event_name}</p>
            <p><strong>Checkpoint:</strong> {team.checkpoint_name}</p>
            <p>{present} of {roster.length} members present</p>
            <RosterTable members={roster} pendingId={pendingId} onToggle={onToggle} />
          </>
        ) : (
          <>
            {scan.participant_name ? <p><strong>{scan.participant_name}</strong></p> : null}
            <p>{scan.event_name} · {scan.checkpoint_name}</p>
          </>
        )}
        {error ? <p className="result bad">{error}</p> : null}
        <button ref={closeRef} type="button" onClick={onClose} disabled={pendingId !== null}>
          Scan next
        </button>
      </div>
    </div>
  );
}
