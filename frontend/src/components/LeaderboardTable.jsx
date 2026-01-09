import React from 'react';
import { Trophy, Crown, Medal } from 'lucide-react';
import '../pages/Leaderboard/LeaderboardPage.css';

const LeaderboardTable = ({ users }) => {
  const getBadgeClass = (badge) => {
    switch (badge) {
      case 'Elite': return 'badge-elite';
      case 'Platinum': return 'badge-platinum';
      case 'Gold': return 'badge-gold';
      case 'Silver': return 'badge-silver';
      case 'Bronze': return 'badge-bronze';
      default: return 'badge-none';
    }
  };

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case 'Elite': return <Crown size={14} />;
      case 'Platinum': return <Medal size={14} />;
      case 'Gold': return <Medal size={14} />;
      case 'Silver': return <Medal size={14} />;
      case 'Bronze': return <Medal size={14} />;
      default: return null;
    }
  };

  return (
    <div className="leaderboard-table-wrapper">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Employee ID</th>
            <th>Points</th>
            <th>Badge</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => {
            const isElite = user.badge === 'Elite';
            const rank = index + 1;

            return (
              <tr
                key={user._id || index}
                className={isElite ? 'row-elite' : ''}
              >
                <td>
                  <div className="rank-cell">
                    {rank === 1 && <Trophy className="trophy-icon trophy-gold" />}
                    {rank === 2 && <Trophy className="trophy-icon trophy-silver" />}
                    {rank === 3 && <Trophy className="trophy-icon trophy-bronze" />}

                    <span className={`rank-badge ${rank <= 3 ? 'top-3' : 'normal'}`}>
                      {rank}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="user-name">
                    {user.name}
                    {isElite && <span className="elite-tag">Top 5%</span>}
                  </div>
                  <div className="user-email">{user.email}</div>
                </td>
                <td>
                  <span className="employee-id">
                    {user.employeeId || 'N/A'}
                  </span>
                </td>
                <td className="points-cell">
                  {user.rewardPoints || 0}
                </td>
                <td>
                  <span className={`badge-pill ${getBadgeClass(user.badge)}`}>
                    {getBadgeIcon(user.badge)}
                    {user.badge}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="empty-state">
          No students found.
        </div>
      )}
    </div>
  );
};

export default LeaderboardTable;
