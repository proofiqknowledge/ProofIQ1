import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import BatchProgressCard from '../../components/BatchProgressCard';
import { toast } from 'react-toastify';

export default function BatchProgressDashboard() {
  const { user, token } = useSelector(s => s.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);

  // ✅ Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12; // Safe limit for rendering

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }
    // Only allow trainer or admin
    const role = (user?.role || '').toLowerCase();
    if (!['trainer', 'admin', 'master'].includes(role)) {
      // unauthorized
      navigate('/403');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/batches/progress-dashboard');
        if (res && res.data && res.data.success) {
          setBatches(res.data.batches || []);
        } else if (res && res.data && Array.isArray(res.data)) {
          // fallback if controller returns raw array
          setBatches(res.data || []);
        } else {
          setBatches([]);
        }
      } catch (err) {
        console.error('Failed to load batches progress', err);
        toast.error(err.response?.data?.message || 'Failed to load batch progress');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user, navigate]);

  // ✅ Pagination Logic
  const totalPages = Math.ceil(batches.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentBatches = batches.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="dashboard-page">
      {/* Back Button */}
      <button
        onClick={() => {
          const role = (user?.role || '').toLowerCase();
          navigate(role === 'admin' ? '/admin' : '/trainer');
        }}
        style={{
          marginBottom: '16px',
          padding: '8px 16px',
          background: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
        onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
      >
        ← Back to Dashboard
      </button>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0 }}>Batch Progress Dashboard</h1>
          <p className="muted">
            Overview of batches and average completion per trainee
            {batches.length > 0 && ` (${batches.length} total batches)`}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ height: 140, padding: 16, borderRadius: 12, background: '#fff', boxShadow: '0 6px 20px rgba(16,24,40,0.04)' }}>
              <div className="skeleton" style={{ width: '60%', height: 18, background: '#eef2f6', borderRadius: 6, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="skeleton" style={{ width: 80, height: 40, background: '#eef2f6', borderRadius: 8 }} />
                <div className="skeleton" style={{ flex: 1, height: 40, background: '#eef2f6', borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {(!batches || batches.length === 0) ? (
            <div className="empty" style={{ padding: 28, background: '#fff', borderRadius: 12, boxShadow: '0 6px 20px rgba(16,24,40,0.04)' }}>
              <h3>No batches found</h3>
              <p className="muted">You currently have no batches assigned. When batches are created they'll appear here with progress statistics.</p>
            </div>
          ) : (
            <>
              <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
                {currentBatches.map(b => (
                  <BatchProgressCard key={b._id} batch={b} />
                ))}
              </div>

              {/* ✅ Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '32px',
                  padding: '16px'
                }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px',
                      background: currentPage === 1 ? '#f3f4f6' : '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    Previous
                  </button>

                  <span style={{ fontSize: '14px', color: '#6c6e70', fontWeight: 500 }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 16px',
                      background: currentPage === totalPages ? '#f3f4f6' : '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        .muted { color: #6c6e70 }
        .card { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 6px 20px rgba(16,24,40,0.04); }
      `}</style>
    </div>
  );
}
