import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

function InterviewHistory() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return navigate('/');
    
    axios.get(`${API_BASE_URL}/api/interviews/user/${user.id}`)
      .then(res => setInterviews(res.data.interviews))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/interview/${id}`);
      setInterviews(prev => prev.filter(i => i._id !== id));
      if (selectedChat?._id === id) {
        setSelectedChat(null);
      }
    } catch {}
  };

  if (loading) return <div style={styles.loader}><div className="spinner" style={styles.spinner}></div></div>;

  return (
    <div style={{ ...styles.container, ...(isMobile ? styles.containerMobile : {}) }}>
      <div style={styles.topNav}>
        <button style={styles.homeBtn} onClick={() => navigate('/dashboard')}>Home</button>
      </div>

      <div style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
        <div>
          <h1 style={{ ...styles.title, ...(isMobile ? styles.titleMobile : {}) }}>Session Archives</h1>
          <p style={styles.subtitle}>History shows full chat. Analysis shows performance report.</p>
        </div>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>New Session</button>
      </div>

      <div style={{ ...styles.statsGrid, ...(isMobile ? styles.statsGridMobile : {}) }}>
        <div style={styles.statCard} className="glass-panel animate-slide-up">
          <div style={styles.statVal}>{interviews.length}</div>
          <div style={styles.statLabel}>Total Interviews</div>
        </div>
        <div style={{...styles.statCard, animationDelay: '0.1s'}} className="glass-panel animate-slide-up">
          <div style={styles.statVal}>{interviews.filter(i => !i.isStart).length}</div>
          <div style={styles.statLabel}>Completed</div>
        </div>
      </div>

      <div style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : {}) }}>
        {interviews.map((item, idx) => (
          <div key={item._id} style={{...styles.card, animationDelay: `${0.1 * idx}s`}} className="glass-panel animate-slide-up">
            <div style={styles.cardHeader}>
              <div style={styles.badge}>{item.isStart ? 'In Progress' : 'Analyzed'}</div>
              <span style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <h3 style={styles.role}>{item.position}</h3>
            <div style={styles.meta}>Level: {item.difficulty} • Exp: {item.experience}</div>
            
            <div style={{ ...styles.actions, ...(isMobile ? styles.actionsMobile : {}) }}>
              <button style={styles.chatBtn} onClick={() => setSelectedChat(item)}>View Chat</button>
              {!item.isStart ? (
                <button style={styles.reportBtn} onClick={() => navigate(`/report/${item._id}`)}>View Analysis</button>
              ) : (
                <button style={styles.resumeBtn} onClick={() => navigate(`/interview/${item._id}`)}>Resume</button>
              )}
              <button style={styles.delBtn} onClick={() => handleDelete(item._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {selectedChat && (
        <div style={styles.modalOverlay} onClick={() => setSelectedChat(null)}>
          <div style={{ ...styles.modalCard, ...(isMobile ? styles.modalCardMobile : {}) }} className="glass-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ ...styles.modalHeader, ...(isMobile ? styles.modalHeaderMobile : {}) }}>
              <div>
                <h2 style={{ ...styles.modalTitle, ...(isMobile ? styles.modalTitleMobile : {}) }}>Chat History</h2>
                <p style={styles.modalSub}>{selectedChat.position} • {selectedChat.difficulty}</p>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedChat(null)}>Close</button>
            </div>

            <div style={styles.chatWrap}>
              {(selectedChat.chatTranscript || []).length > 0 ? (
                selectedChat.chatTranscript.map((msg, idx) => (
                  <div key={idx} style={msg.role === 'user' ? styles.userRow : styles.aiRow}>
                    <div style={{ ...(msg.role === 'user' ? styles.userBubble : styles.aiBubble), ...(isMobile ? styles.mobileBubble : {}) }}>
                      <div style={styles.msgRole}>{msg.role === 'user' ? 'You' : 'AI Interviewer'}</div>
                      <div style={styles.msgText}>{msg.message}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={styles.emptyChat}>No chat messages available for this interview yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '40px', maxWidth: '1200px', margin: '0 auto', paddingTop: '80px' },
  containerMobile: { padding: '16px', paddingTop: '72px' },
  loader: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  spinner: { width: '40px', height: '40px', border: '4px solid #e0e7ff', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  topNav: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' },
  homeBtn: { background: '#fff', color: '#0f172a', padding: '10px 20px', borderRadius: '10px', borderTop: '2px solid rgba(255,255,255,0.95)', borderLeft: '2px solid rgba(255,255,255,0.85)', borderBottom: '2px solid rgba(99,102,241,0.18)', borderRight: '2px solid rgba(99,102,241,0.12)', fontWeight: '600', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(99,102,241,0.09)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: '14px', marginBottom: '24px' },
  title: { fontSize: '36px', fontWeight: '800', marginBottom: '8px', color: '#0f172a' },
  titleMobile: { fontSize: '28px' },
  subtitle: { color: '#64748b' },
  backBtn: { background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white', padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(79,70,229,0.22), 0 6px 18px rgba(99,102,241,0.28)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' },
  statsGridMobile: { gridTemplateColumns: '1fr', gap: '14px', marginBottom: '24px' },
  statCard: { padding: '24px', textAlign: 'center' },
  statVal: { fontSize: '48px', fontWeight: '800', color: '#6366f1', marginBottom: '8px' },
  statLabel: { color: '#64748b', fontWeight: '500' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  gridMobile: { gridTemplateColumns: '1fr', gap: '14px' },
  card: { padding: '24px', display: 'flex', flexDirection: 'column' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: 'rgba(16,185,129,0.10)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' },
  date: { fontSize: '13px', color: '#64748b' },
  role: { fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#0f172a' },
  meta: { color: '#64748b', fontSize: '14px', marginBottom: '24px' },
  actions: { display: 'flex', gap: '12px', marginTop: 'auto' },
  actionsMobile: { flexDirection: 'column' },
  chatBtn: { flex: 1, background: 'rgba(14,165,233,0.10)', color: '#0369a1', borderTop: '2px solid rgba(255,255,255,0.9)', borderLeft: '2px solid rgba(255,255,255,0.8)', borderBottom: '2px solid rgba(14,165,233,0.22)', borderRight: '2px solid rgba(14,165,233,0.15)', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(14,165,233,0.1)' },
  reportBtn: { flex: 1, background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(15,23,42,0.18)' },
  resumeBtn: { flex: 1, background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(79,70,229,0.2)' },
  delBtn: { background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderTop: '2px solid rgba(255,255,255,0.9)', borderLeft: '2px solid rgba(255,255,255,0.8)', borderBottom: '2px solid rgba(239,68,68,0.25)', borderRight: '2px solid rgba(239,68,68,0.18)', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(239,68,68,0.08)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1200 },
  modalCard: { width: 'min(920px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', padding: '18px' },
  modalCardMobile: { maxHeight: '92vh', padding: '12px' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderBottom: '1px solid rgba(99,102,241,0.14)', paddingBottom: '12px', marginBottom: '12px' },
  modalHeaderMobile: { flexDirection: 'column', alignItems: 'flex-start' },
  modalTitle: { margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' },
  modalTitleMobile: { fontSize: '20px' },
  modalSub: { margin: '4px 0 0', color: '#64748b' },
  closeBtn: { background: '#fff', color: '#0f172a', borderTop: '2px solid rgba(255,255,255,0.95)', borderLeft: '2px solid rgba(255,255,255,0.85)', borderBottom: '2px solid rgba(99,102,241,0.18)', borderRight: '2px solid rgba(99,102,241,0.12)', padding: '8px 14px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '2px 2px 0 rgba(99,102,241,0.08)' },
  chatWrap: { overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '10px' },
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  aiRow: { display: 'flex', justifyContent: 'flex-start' },
  userBubble: { maxWidth: '78%', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white', borderRadius: '14px 14px 4px 14px', padding: '10px 12px', boxShadow: '3px 3px 0 rgba(79,70,229,0.2)' },
  aiBubble: { maxWidth: '78%', background: '#fff', borderTop: '2px solid rgba(255,255,255,0.95)', borderLeft: '2px solid rgba(255,255,255,0.85)', borderBottom: '2px solid rgba(99,102,241,0.18)', borderRight: '2px solid rgba(99,102,241,0.12)', color: '#0f172a', borderRadius: '14px 14px 14px 4px', padding: '10px 12px', boxShadow: '2px 2px 0 rgba(99,102,241,0.08)' },
  mobileBubble: { maxWidth: '92%' },
  msgRole: { fontSize: '12px', fontWeight: 700, marginBottom: '4px', opacity: 0.85 },
  msgText: { whiteSpace: 'pre-wrap', lineHeight: 1.5 },
  emptyChat: { color: '#64748b', textAlign: 'center', padding: '20px' }
};

export default InterviewHistory;