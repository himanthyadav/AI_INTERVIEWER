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
  spinner: { width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' },
  topNav: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' },
  homeBtn: { background: 'var(--surface)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', fontWeight: '600', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' },
  headerMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: '14px', marginBottom: '24px' },
  title: { fontSize: '36px', fontWeight: '700', marginBottom: '8px' },
  titleMobile: { fontSize: '28px' },
  subtitle: { color: 'var(--text-secondary)' },
  backBtn: { background: 'var(--primary)', color: 'white', padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' },
  statsGridMobile: { gridTemplateColumns: '1fr', gap: '14px', marginBottom: '24px' },
  statCard: { padding: '24px', textAlign: 'center' },
  statVal: { fontSize: '48px', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' },
  statLabel: { color: 'var(--text-secondary)', fontWeight: '500' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  gridMobile: { gridTemplateColumns: '1fr', gap: '14px' },
  card: { padding: '24px', display: 'flex', flexDirection: 'column' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(16,185,129,0.1)', color: 'var(--success)' },
  date: { fontSize: '13px', color: 'var(--text-secondary)' },
  role: { fontSize: '20px', fontWeight: '700', marginBottom: '8px' },
  meta: { color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' },
  actions: { display: 'flex', gap: '12px', marginTop: 'auto' },
  actionsMobile: { flexDirection: 'column' },
  chatBtn: { flex: 1, background: 'rgba(14,165,233,0.12)', color: '#0369a1', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  reportBtn: { flex: 1, background: 'var(--text-primary)', color: 'var(--surface)', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  resumeBtn: { flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  delBtn: { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1200 },
  modalCard: { width: 'min(920px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', padding: '18px' },
  modalCardMobile: { maxHeight: '92vh', padding: '12px' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' },
  modalHeaderMobile: { flexDirection: 'column', alignItems: 'flex-start' },
  modalTitle: { margin: 0, fontSize: '24px', fontWeight: 700 },
  modalTitleMobile: { fontSize: '20px' },
  modalSub: { margin: '4px 0 0', color: 'var(--text-secondary)' },
  closeBtn: { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' },
  chatWrap: { overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '10px' },
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  aiRow: { display: 'flex', justifyContent: 'flex-start' },
  userBubble: { maxWidth: '78%', background: 'var(--primary)', color: 'white', borderRadius: '14px 14px 4px 14px', padding: '10px 12px' },
  aiBubble: { maxWidth: '78%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '14px 14px 14px 4px', padding: '10px 12px' },
  mobileBubble: { maxWidth: '92%' },
  msgRole: { fontSize: '12px', fontWeight: 700, marginBottom: '4px', opacity: 0.9 },
  msgText: { whiteSpace: 'pre-wrap', lineHeight: 1.5 },
  emptyChat: { color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }
};

export default InterviewHistory;