import { useEffect, useRef, useState } from "react";
import {
  fetchCheckpoints,
  setMemberAttendance,
  submitScan,
  type RosterMember,
  type ScanPayload,
  type ScannerCheckpoint,
} from "./api";
import { startQrCamera, type CameraHandle } from "./camera";
import ScanResultModal from "./ScanResultModal";
import { shouldSubmitToken } from "./throttle";
import { extractScanToken } from "./token";

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<CameraHandle | null>(null);
  const lastToken = useRef<string | null>(null);
  const scanningLock = useRef(false);
  const popupOpen = useRef(false);

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
      .catch(() => setActionError("Could not load checkpoints. Create a common checkpoint in Admin → Attendance."));
  }, []);

  useEffect(() => {
    return () => {
      cameraRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    popupOpen.current = scan !== null;
  }, [scan]);

  function stopCamera() {
    cameraRef.current?.stop();
    cameraRef.current = null;
    setCameraOn(false);
  }

  function selectCheckpoint(nextId: string) {
    stopCamera();
    lastToken.current = null;
    setScan(null);
    setRoster([]);
    setCapability(null);
    setPendingId(null);
    setCheckpointId(nextId);
    setStatusText(nextId ? "Checkpoint ready. Start scanning." : "Select a checkpoint, then scan.");
  }

  function applyScan(payload: ScanPayload) {
    setScan(payload);
    setCapability(payload.capability || null);
    setRoster(payload.team?.roster || []);
    setStatusText(payload.recorded ? "Checked in" : payload.duplicate ? "Already checked in" : "Not checked in");
  }

  async function runScan(raw: string) {
    const token = extractScanToken(raw);
    if (!checkpointId || popupOpen.current) return;
    if (!shouldSubmitToken(token, lastToken.current, scanningLock.current)) return;
    scanningLock.current = true;
    lastToken.current = token;
    setActionError(null);
    try {
      applyScan(await submitScan(token, checkpointId));
    } catch (err) {
      lastToken.current = null;
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

  function closePopup() {
    if (pendingId) return;
    lastToken.current = null;
    setScan(null);
    setActionError(null);
    setStatusText("Ready for the next QR.");
  }

  async function onToggle(member: RosterMember, checkedIn: boolean) {
    if (!capability || pendingId) return;
    if (!checkedIn && !window.confirm("Mark this member absent? This records an attendance correction.")) return;
    const previous = roster;
    setPendingId(member.team_member_id);
    setActionError(null);
    try {
      const result = await setMemberAttendance(capability, member.team_member_id, checkedIn);
      if (result.checked_in !== checkedIn) {
        setRoster(previous);
        setActionError(result.message);
        return;
      }
      setRoster((rows) =>
        rows.map((row) =>
          row.team_member_id === member.team_member_id ? { ...row, checked_in: result.checked_in } : row,
        ),
      );
    } catch (err) {
      setRoster(previous);
      setActionError(err instanceof Error ? err.message : "Could not update attendance.");
    } finally {
      setPendingId(null);
    }
  }

  const selected = checkpoints.find((checkpoint) => checkpoint.id === checkpointId);

  return (
    <main className="app">
      <header className="top">
        <div>
          <p className="eyebrow">Kratos ’26</p>
          <h1>Check-in</h1>
        </div>
        <p className="status-pill">{cameraOn ? "Camera on" : statusText}</p>
      </header>

      <section className="panel">
        <label className="field">
          Step 1 · Checkpoint
          <select value={checkpointId} onChange={(event) => selectCheckpoint(event.target.value)}>
            <option value="">Select a checkpoint</option>
            {checkpoints.map((checkpoint) => (
              <option key={checkpoint.id} value={checkpoint.id}>{checkpoint.name}</option>
            ))}
          </select>
        </label>
        <p className="meta">
          {selected ? `${selected.name}${selected.location ? ` · ${selected.location}` : ""}` : "A checkpoint is required before scanning."}
        </p>
        {checkpoints.length === 0 && (
          <p className="meta">No common checkpoint yet. Create one in Admin → Attendance. It applies to every event.</p>
        )}
      </section>

      <section className="panel stage">
        <p className="meta">Step 2 · Scanner · {selected?.name || "No checkpoint"}</p>
        <video ref={videoRef} muted playsInline />
        <div className="actions">
          {!cameraOn ? (
            <button type="button" onClick={() => void startCamera()} disabled={!checkpointId}>
              Start scanning
            </button>
          ) : (
            <button type="button" className="secondary" onClick={stopCamera}>Stop scanning</button>
          )}
        </div>
        {cameraError && <p className="result bad">{cameraError}</p>}
        {actionError && !scan && <p className="result bad">{actionError}</p>}
        <label className="field" style={{ marginTop: 14 }}>
          Manual token
          <input
            type="text"
            value={manualToken}
            onChange={(event) => setManualToken(event.target.value)}
            placeholder="Paste the token if the camera is unavailable"
            disabled={!checkpointId}
          />
        </label>
        <button type="button" disabled={!checkpointId || !manualToken.trim()} onClick={() => void runScan(manualToken)}>
          Submit token
        </button>
      </section>

      {scan && (
        <ScanResultModal
          scan={scan}
          roster={roster}
          pendingId={pendingId}
          error={actionError}
          onToggle={(member, checkedIn) => void onToggle(member, checkedIn)}
          onClose={closePopup}
        />
      )}
    </main>
  );
}
