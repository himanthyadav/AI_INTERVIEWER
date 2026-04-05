import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

function InterviewHistory() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return navigate('/');
    
    axios.get(`${API_BASE_URL}/api/interviews/user/${user.id}`)
      .then(res => setInterviews(res.data.interviews))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/interview/${id}`);
      setInterviews(prev => prev.filter(i => i._id !== id));
    } catch {}
  };

  if (loading) return <div style={styles.loader}><div className="spinner" style={styles.spinner}></div></div>;

  return (
    <div style={styles.container}>
      <div style={styles.topNav}>
        <button style={styles.homeBtn} onClick={() => navigate('/dashboard')}>Home</button>
      </div>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Session Archives</h1>
          <p style={styles.subtitle}>Review your past performance and metrics.</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>New Session</button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard} className="glass-panel animate-slide-up">
          <div style={styles.statVal}>{interviews.length}</div>
          <div style={styles.statLabel}>Total Interviews</div>
        </div>
        <div style={{...styles.statCard, animationDelay: '0.1s'}} className="glass-panel animate-slide-up">
          <div style={styles.statVal}>{interviews.filter(i => !i.isStart).length}</div>
          <div style={styles.statLabel}>Completed</div>
        </div>
      </div>

      <div style={styles.grid}>
        {interviews.map((item, idx) => (
          <div key={item._id} style={{...styles.card, animationDelay: `${0.1 * idx}s`}} className="glass-panel animate-slide-up">
            <div style={styles.cardHeader}>
              <div style={styles.badge}>{item.isStart ? 'In Progress' : 'Analyzed'}</div>
              <span style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <h3 style={styles.role}>{item.position}</h3>
            <div style={styles.meta}>Level: {item.difficulty} • Exp: {item.experience}</div>
            
            <div style={styles.actions}>
              {!item.isStart ? (
                <button style={styles.reportBtn} onClick={() => navigate(`/report/${item._id}`)}>View Report</button>
              ) : (
                <button style={styles.resumeBtn} onClick={() => navigate(`/interview/${item._id}`)}>Resume</button>
              )}
              <button style={styles.delBtn} onClick={() => handleDelete(item._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px', maxWidth: '1200px', margin: '0 auto', paddingTop: '80px' },
  loader: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  spinner: { width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' },
  topNav: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' },
  homeBtn: { background: 'var(--surface)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', fontWeight: '600', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' },
  title: { fontSize: '36px', fontWeight: '700', marginBottom: '8px' },
  subtitle: { color: 'var(--text-secondary)' },
  backBtn: { background: 'var(--primary)', color: 'white', padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' },
  statCard: { padding: '24px', textAlign: 'center' },
  statVal: { fontSize: '48px', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' },
  statLabel: { color: 'var(--text-secondary)', fontWeight: '500' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  card: { padding: '24px', display: 'flex', flexDirection: 'column' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(16,185,129,0.1)', color: 'var(--success)' },
  date: { fontSize: '13px', color: 'var(--text-secondary)' },
  role: { fontSize: '20px', fontWeight: '700', marginBottom: '8px' },
  meta: { color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' },
  actions: { display: 'flex', gap: '12px', marginTop: 'auto' },
  reportBtn: { flex: 1, background: 'var(--text-primary)', color: 'var(--surface)', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  resumeBtn: { flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  delBtn: { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }
};

export default InterviewHistory;