import React, { useState, useEffect } from 'react';
import api from '../services/api';

function ExamStatusTracking() {
  const [exams, setExams] = useState([]);
  const [interns, setInterns] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {

      // Fetch exams
      const examsResponse = await api.get('/exams');
      setExams(examsResponse.data);

      // Fetch interns
      const internsResponse = await api.get('/admin/users');
      setInterns(internsResponse.data.filter(user => user.role === 'INTERN'));

      // Fetch all results
      const resultsResponse = await api.get('/results');
      setExamResults(resultsResponse.data);

    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays to prevent crashes
      setExams([]);
      setInterns([]);
      setExamResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (examId, internId) => {
    const result = examResults.find(r => {
      // Handle both string and object ID comparisons
      const resultExamId = r.examId?._id || r.examId;
      const resultStudentId = r.studentId?._id || r.studentId;
      return resultExamId === examId && resultStudentId === internId;
    });

    if (result) {
      return {
        status: 'Completed',
        score: result.score,
        total: result.totalQuestions,
        submittedAt: new Date(result.createdAt).toLocaleString()
      };
    }
    return { status: 'Not Completed', score: 0, total: 0, submittedAt: null };
  };

  const getExamCompletionStats = (examId) => {
    const examResultsForExam = examResults.filter(r => {
      const resultExamId = r.examId?._id || r.examId;
      return resultExamId === examId;
    });
    const totalInterns = interns.length;
    const completedCount = examResultsForExam.length;
    return {
      completed: completedCount,
      total: totalInterns,
      percentage: totalInterns > 0 ? Math.round((completedCount / totalInterns) * 100) : 0
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-500">Loading exam status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Exam Status Tracking</h2>

      {/* Exam Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam to View Status</label>
        <select
          value={selectedExam || ''}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose an exam...</option>
          {exams.map(exam => (
            <option key={exam._id} value={exam._id}>
              {exam.title} ({exam.examType.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      {selectedExam && (
        <div className="space-y-6">
          {/* Exam Overview */}
          {(() => {
            const exam = exams.find(e => e._id === selectedExam);
            const stats = getExamCompletionStats(selectedExam);
            return (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{exam?.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{stats.total - stats.completed}</div>
                    <div className="text-sm text-gray-600">Not Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.percentage}%</div>
                    <div className="text-sm text-gray-600">Completion Rate</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Intern Status Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intern
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {interns.map(intern => {
                  const status = getExamStatus(selectedExam, intern._id);
                  return (
                    <tr key={intern._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {intern.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {intern.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {status.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {status.status === 'Completed' ? `${status.score}/${status.total}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {status.submittedAt || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-2">Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Interns:</span> {interns.length}
              </div>
              <div>
                <span className="font-medium">Completed:</span> {getExamCompletionStats(selectedExam).completed}
              </div>
              <div>
                <span className="font-medium">Not Completed:</span> {getExamCompletionStats(selectedExam).total - getExamCompletionStats(selectedExam).completed}
              </div>
              <div>
                <span className="font-medium">Completion Rate:</span> {getExamCompletionStats(selectedExam).percentage}%
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedExam && (
        <div className="text-center py-8 text-gray-500">
          Select an exam to view status tracking
        </div>
      )}
    </div>
  );
}

export default ExamStatusTracking;
