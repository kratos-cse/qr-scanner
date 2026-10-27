import type { RosterMember } from "./api";

type Props = {
  members: RosterMember[];
  pendingId: string | null;
  onCheckIn: (member: RosterMember) => void;
};

export default function RosterTable({ members, pendingId, onCheckIn }: Props) {
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
          const checked = member.checked_in;
          return (
            <tr key={member.team_member_id}>
              <td>{member.name}</td>
              <td>{member.role}</td>
              <td>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={checked || pendingId !== null}
                    onChange={() => {
                      if (!checked) onCheckIn(member);
                    }}
                  />
                  <span>{pending ? "Saving…" : checked ? "Present" : "Mark present"}</span>
                </label>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
