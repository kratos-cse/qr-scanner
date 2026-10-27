import { useEffect, useRef, useState } from "react";
import {
  checkInMember,
  fetchCheckpoints,
  submitScan,
  type RosterMember,
  type ScanPayload,
  type ScannerCheckpoint,
} from "./api";
import { startQrCamera, type CameraHandle } from "./camera";
import RosterTable from "./RosterTable";
import { shouldSubmitToken } from "./throttle";

function resultClass(payload: ScanPayload | null): string {
  if (!payload) return "";
  if (payload.recorded) return "ok";
  if (payload.duplicate) return "warn";
  return "bad";
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<CameraHandle | null>(null);
  const lastToken = useRef<string | null>(null);
  const scanningLock = useRef(false);

  const [checkpoints, setCheckpoints] = useState<ScannerCheckpoint[]>([]);
  const [checkpointId, setCheckpointId] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [statusText, setStatusText] = useState("Select a checkpoint, then scan.");
  const [scan, setScan] = useState<ScanPayload | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [capability, setCapability] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCheckpoints()
      .then(setCheckpoints)
      .catch(() => setActionError("Could not load checkpoints. Create them in the admin Attendance page."));
  }, []);

  useEffect(() => {
    return () => {
      cameraRef.current?.stop();
    };
  }, []);

  function applyScan(payload: ScanPayload) {
    setScan(payload);
    setCapability(payload.capability || null);
    setRoster(payload.team?.roster || []);
    setStatusText(payload.recorded ? "Checked in" : payload.duplicate ? "Already checked in" : "Not checked in");
  }

  async function runScan(raw: string) {
    const token = raw.trim();
    if (!checkpointId || !shouldSubmitToken(token, lastToken.current, scanningLock.current)) return;
    scanningLock.current = true;
    lastToken.current = token;
    setActionError(null);
    try {
      const payload = await submitScan(token, checkpointId);
      applyScan(payload);
    } catch (err) {
      lastToken.current = null;
      setScan(null);
      setRoster([]);
      setCapability(null);
      setStatusText("Scan failed");
      setActionError(err instanceof Error ? err.message : "Network error.");
    } finally {
      scanningLock.current = false;
    }
  }

  async function startCamera() {
    if (!videoRef.current || !checkpointId) return;
    setCameraError(null);
    try {
      const handle = await startQrCamera(videoRef.current, (token) => {
        void runScan(token);
      });
      cameraRef.current = handle;
      setCameraOn(true);
    } catch (err) {
      setCameraOn(false);
      setCameraError(err instanceof Error ? err.message : "Camera unavailable.");
    }
  }

  function stopCamera() {
    cameraRef.current?.stop();
    cameraRef.current = null;
    setCameraOn(false);
  }

  function scanAgain() {
    lastToken.current = null;
    setScan(null);
    setActionError(null);
    setStatusText(checkpointId ? "Ready for the next QR." : "Select a checkpoint.");
  }

  async function onCheckIn(member: RosterMember) {
    if (!capability || member.checked_in) return;
    const previous = roster;
    setPendingId(member.team_member_id);
    setActionError(null);
    try {
      const result = await checkInMember(capability, member.team_member_id);
      if (!result.checked_in) {
        setRoster(previous);
        setActionError(result.message);
        return;
      }
      setRoster((rows) =>
        rows.map((row) =>
          row.team_member_id === member.team_member_id ? { ...row, checked_in: true } : row,
        ),
      );
    } catch (err) {
      setRoster(previous);
      setActionError(err instanceof Error ? err.message : "Could not record attendance.");
    } finally {
      setPendingId(null);
    }
  }

  const team = scan?.team;
  const checkedCount = roster.filter((m) => m.checked_in).length;
  const selected = checkpoints.find((c) => c.id === checkpointId);
  const eventName = selected?.event_name;
  const checkpointName = selected?.name;

  return (
    <main className="app">
      <header>
        <h1>KRATOS ’26 check-in</h1>
        <p>{statusText}</p>
      </header>

      <section className="panel">
        <label className="field">
          Checkpoint
          <select value={checkpointId} onChange={(e) => setCheckpointId(e.target.value)}>
            <option value="">Select a checkpoint</option>
            {checkpoints.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.event_name ? `${cp.event_name} — ${cp.name}` : cp.name}
              </option>
            ))}
          </select>
        </label>
        <p className="meta">
          {eventName || "Event comes from the QR"} · {checkpointName || "No checkpoint"}
        </p>
        {checkpoints.length === 0 && (
          <p className="meta">No checkpoints yet. Create them in Admin → Attendance.</p>
        )}
      </section>

      <section className="panel">
        <video ref={videoRef} muted playsInline />
        <div className="actions" style={{ marginTop: 12 }}>
          {!cameraOn ? (
            <button type="button" onClick={() => void startCamera()} disabled={!checkpointId}>
              Start scanning
            </button>
          ) : (
            <button type="button" className="secondary" onClick={stopCamera}>Stop scanning</button>
          )}
          <button type="button" className="secondary" onClick={scanAgain} disabled={!checkpointId}>
            Scan next
          </button>
        </div>
        {cameraError && <p className="result bad">{cameraError}</p>}
        <label className="field" style={{ marginTop: 14 }}>
          Manual QR token
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste the token if the camera is unavailable"
          />
        </label>
        <button type="button" disabled={!checkpointId || !manualToken.trim()} onClick={() => void runScan(manualToken)}>
          Submit token
        </button>
      </section>

      {actionError && <p className="result bad">{actionError}</p>}

      {scan && (
        <section className="panel">
          <p className={`result ${resultClass(scan)}`}>{scan.message}</p>
          <p className="meta">{scan.event_name || eventName} · {scan.checkpoint_name || checkpointName}</p>
          {!team && scan.participant_name ? <p><strong>{scan.participant_name}</strong></p> : null}
          {team ? (
            <>
              <p><strong>Team:</strong> {team.team_name || "—"}</p>
              <p><strong>College:</strong> {team.college_name || "—"}</p>
              <p><strong>Event:</strong> {team.event_name}</p>
              <p><strong>Checkpoint:</strong> {team.checkpoint_name}</p>
              <p>{checkedCount} of {roster.length} members checked in</p>
              <RosterTable members={roster} pendingId={pendingId} onCheckIn={(member) => void onCheckIn(member)} />
            </>
          ) : null}
        </section>
      )}
    </main>
  );
}
