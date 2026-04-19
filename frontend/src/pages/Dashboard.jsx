import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [isBootstrappingUser, setIsBootstrappingUser] = useState(false);
  const [toast, setToast] = useState('');
  const [interviewData, setInterviewData] = useState({
    position: 'Frontend Developer',
    experience: 'Fresher',
    round: 'Technical',
    duration: '15 mins',
    interviewer: 'Emma',
    termsAccepted: false
  });
  const [isPrereqOpen, setIsPrereqOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [didPlayAudioSample, setDidPlayAudioSample] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [compatibility, setCompatibility] = useState({
    browser: true,
    microphone: false,
    camera: false,
    internet: navigator.onLine,
    audio: false
  });

  const rounds = ['Warm Up', 'Technical', 'Behavioral'];
  const durations = ['5 mins', '15 mins', '30 mins'];
  const interviewers = [
    { name: 'Emma', type: 'US Accent', icon: '👩‍💼' },
    { name: 'Kapil', type: 'IN Accent', icon: '👨‍💼' },
    { name: 'John', type: 'US Accent', icon: '👨‍🏫' }
  ];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const ensureUserSession = async () => {
      if (user) return;
      try {
        setIsBootstrappingUser(true);
        const response = await axios.post(`${API_BASE_URL}/api/guest-login`);
        const guestUser = response.data?.user;
        if (guestUser?.id) {
          localStorage.setItem('user', JSON.stringify(guestUser));
          setUser(guestUser);
        }
      } catch {
        showToast('Session error');
      } finally {
        setIsBootstrappingUser(false);
      }
    };
    ensureUserSession();

    const handleOnline = () => setCompatibility(prev => ({ ...prev, internet: true }));
    const handleOffline = () => setCompatibility(prev => ({ ...prev, internet: false }));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const handlePrerequisiteOpen = () => {
    if (!interviewData.position.trim()) return showToast('Enter target role');
    if (!interviewData.termsAccepted) return showToast('Accept terms');
    setIsPrereqOpen(true);
  };

  const runCompatibilityCheck = async () => {
    setIsCheckingDevices(true);
    let micOk = false, camOk = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      micOk = camOk = true;
      stream.getTracks().forEach(t => t.stop());
    } catch {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        micOk = true;
        mic.getTracks().forEach(t => t.stop());
      } catch {}
    }
    setCompatibility(prev => ({ ...prev, microphone: micOk, camera: camOk }));
    setIsCheckingDevices(false);
  };

  const playAudioSample = () => {
    if (!('speechSynthesis' in window)) return showToast('Not supported');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance('Audio check');
    window.speechSynthesis.speak(u);
    setDidPlayAudioSample(true);
  };

  const handleStartInterview = async () => {
    if (!user?.id) return navigate('/');
    try {
      setIsStarting(true);
      const res = await axios.post(`${API_BASE_URL}/api/interview/start`, {
        userId: user.id,
        position: interviewData.position,
        experience: interviewData.experience,
        difficulty: interviewData.round
      });
      navigate(`/interview/${res.data.interviewId}`);
    } catch {
      showToast('Start failed');
      setIsStarting(false);
    }
  };

  const canStart = compatibility.microphone && compatibility.internet && compatibility.audio;

  if (isBootstrappingUser) return <div style={styles.loader}>Loading...</div>;

  return (
    <div style={styles.container}>
      {toast && <div style={styles.toast}>{toast}</div>}

      <aside style={{ ...styles.sidebar, width: isSidebarOpen ? '240px' : '80px' }}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo} />
          {isSidebarOpen && <span style={styles.brand}>Studio</span>}
        </div>

        <nav style={styles.sideNav}>
          <button style={styles.navBtn} onClick={() => navigate('/dashboard')}>{isSidebarOpen ? 'Dashboard' : '🏠'}</button>
          <button style={styles.navBtn} onClick={() => navigate('/history')}>{isSidebarOpen ? 'History' : '📋'}</button>
          <button style={styles.navBtn} onClick={() => navigate('/profile')}>{isSidebarOpen ? 'Profile' : '👤'}</button>
        </nav>

        <button style={styles.toggleBtn} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? 'Collapse' : '→'}
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <h1>Setup Interview</h1>
          <p>Configure your session parameters below.</p>
        </header>

        <div style={styles.card}>
          <div style={styles.inputGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Position</label>
              <input
                style={styles.input}
                value={interviewData.position}
                onChange={e => setInterviewData({ ...interviewData, position: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Experience</label>
              <select
                style={styles.input}
                value={interviewData.experience}
                onChange={e => setInterviewData({ ...interviewData, experience: e.target.value })}
              >
                <option>Fresher</option>
                <option>1-3 Years</option>
                <option>5+ Years</option>
              </select>
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Type</label>
            <div style={styles.row}>
              {rounds.map(r => (
                <button
                  key={r}
                  style={{ ...styles.chip, ...(interviewData.round === r && styles.activeChip) }}
                  onClick={() => setInterviewData({ ...interviewData, round: r })}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Persona</label>
            <div style={styles.personaGrid}>
              {interviewers.map(i => (
                <div
                  key={i.name}
                  style={{ ...styles.persona, ...(interviewData.interviewer === i.name && styles.activePersona) }}
                  onClick={() => setInterviewData({ ...interviewData, interviewer: i.name })}
                >
                  <span style={{ fontSize: '24px' }}>{i.icon}</span>
                  <div>
                    <div style={{ fontWeight: '600' }}>{i.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>{i.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.cardFooter}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={interviewData.termsAccepted}
                onChange={e => setInterviewData({ ...interviewData, termsAccepted: e.target.checked })}
              />
              Accept terms
            </label>
            <button style={styles.primaryBtn} onClick={handlePrerequisiteOpen}>Start Session</button>
          </div>
        </div>
      </main>

      {isPrereqOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2>System Check</h2>
            <div style={styles.checkList}>
              <div style={styles.checkItem}>Internet <span style={compatibility.internet ? styles.ok : styles.err}>{compatibility.internet ? 'OK' : 'OFF'}</span></div>
              <div style={styles.checkItem}>Mic <span style={compatibility.microphone ? styles.ok : styles.err}>{compatibility.microphone ? 'OK' : 'MISSING'}</span></div>
              <div style={styles.checkItem}>Audio <span style={compatibility.audio ? styles.ok : styles.err}>{compatibility.audio ? 'OK' : 'TEST'}</span></div>
            </div>
            
            <button style={styles.testBtn} onClick={runCompatibilityCheck} disabled={isCheckingDevices}>
              {isCheckingDevices ? 'Checking...' : 'Check Hardware'}
            </button>
            <button style={styles.testBtn} onClick={playAudioSample}>Test Audio</button>

            {didPlayAudioSample && (
              <div style={styles.row}>
                <button style={styles.successBtn} onClick={() => setCompatibility({ ...compatibility, audio: true })}>I heard it</button>
                <button style={styles.errBtn} onClick={() => setCompatibility({ ...compatibility, audio: false })}>No</button>
              </div>
            )}

            <button
              style={{ ...styles.launchBtn, opacity: canStart ? 1 : 0.5 }}
              disabled={!canStart || isStarting}
              onClick={handleStartInterview}
            >
              {isStarting ? 'Launching...' : 'Enter Interview'}
            </button>
            <button style={styles.cancelBtn} onClick={() => setIsPrereqOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: 'system-ui' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#334155', color: '#fff', padding: '10px 20px', borderRadius: '8px', zIndex: 100 },
  sidebar: { background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '20px', transition: 'width 0.3s' },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' },
  logo: { width: '12px', height: '12px', background: '#6366f1', borderRadius: '50%' },
  brand: { fontWeight: '700', fontSize: '18px' },
  sideNav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  navBtn: { padding: '12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontWeight: '500' },
  toggleBtn: { border: 'none', background: '#f1f5f9', padding: '8px', cursor: 'pointer', borderRadius: '6px' },
  main: { flex: 1, padding: '40px', maxWidth: '1000px', margin: '0 auto' },
  header: { marginBottom: '32px' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  inputGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#64748b' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' },
  section: { marginBottom: '24px' },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  chip: { padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' },
  activeChip: { background: '#6366f1', color: '#fff', borderColor: '#6366f1' },
  personaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  persona: { padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' },
  activePersona: { borderColor: '#6366f1', background: '#f5f3ff' },
  cardFooter: { marginTop: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' },
  primaryBtn: { background: '#6366f1', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' },
  checkList: { background: '#f8fafc', padding: '16px', borderRadius: '8px' },
  checkItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: '14px' },
  ok: { color: '#10b981', fontWeight: '700' },
  err: { color: '#ef4444', fontWeight: '700' },
  testBtn: { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' },
  successBtn: { flex: 1, padding: '10px', background: '#ecfdf5', color: '#059669', border: '1px solid #10b981', borderRadius: '8px', cursor: 'pointer' },
  errBtn: { flex: 1, padding: '10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer' },
  launchBtn: { background: '#6366f1', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }
};

export default Dashboard;