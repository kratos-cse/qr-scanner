import type { RosterMember } from "./api";

type Props = {
  members: RosterMember[];
  pendingId: string | null;
  onToggle: (member: RosterMember, checkedIn: boolean) => void;
};

export default function RosterTable({ members, pendingId, onToggle }: Props) {
  return (
    <table className="roster">
      <thead>
        <tr>
          <th>Team member</th>
          <th>Role</th>
          <th>Attendance</th>
        </tr>
      </thead>
      <tbody>
        {members.map((member) => {
          const pending = pendingId === member.team_member_id;
          return (
            <tr key={member.team_member_id}>
              <td>{member.name}</td>
              <td>{member.role}</td>
              <td>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={member.checked_in}
                    disabled={pendingId !== null}
                    onChange={(event) => onToggle(member, event.target.checked)}
                  />
                  <span>{pending ? "Saving…" : member.checked_in ? "Present" : "Absent"}</span>
                </label>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
