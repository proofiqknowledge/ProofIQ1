import React, { useEffect, useState } from 'react';
import LeaderboardTable from '../../components/LeaderboardTable';
import { getLeaderboard } from '../../services/userService';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const users = await getLeaderboard();   // Fetch all students

        if (!Array.isArray(users)) {
          console.error('Invalid leaderboard data:', users);
          throw new Error('Invalid leaderboard data format');
        }

        // Filter students only
        const studentList = users.filter(user => user.role === 'Student');

        setStudents(studentList);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to fetch leaderboard data');
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );

  if (error)
    return (
      <div className="error-container">
        <div className="error-text">{error}</div>
      </div>
    );

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1 className="leaderboard-title">🏆 Leaderboard</h1>
        <p className="leaderboard-subtitle">
          Celebrating our top performers and their achievements
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card gold">
          <div className="stat-title">🥇 Top Score</div>
          <div className="stat-value">
            {students[0]?.rewardPoints || 0}
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-title">👥 Total Participants</div>
          <div className="stat-value">{students.length}</div>
        </div>

        <div className="stat-card green">
          <div className="stat-title">⭐ Top Performers</div>
          <div className="stat-list">
            {students.slice(0, 3).map((student, idx) => (
              <div key={student._id || idx} className="stat-list-item">
                <span className="stat-list-rank">{idx + 1}.</span>
                <span className="stat-list-name">{student.name}</span>
              </div>
            ))}
            {students.length === 0 && <div className="stat-list-empty">No data available</div>}
          </div>
        </div>
      </div>

      <LeaderboardTable users={students} />
    </div>
  );
};

export default LeaderboardPage;
