import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
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
    { name: 'Emma', type: 'US Accent', icon: 'Emma' },
    { name: 'Kapil', type: 'IN Accent', icon: 'Kapil' },
    { name: 'John', type: 'US Accent', icon: 'John' }
  ];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const handleOnline = () => setCompatibility(prev => ({ ...prev, internet: true }));
    const handleOffline = () => setCompatibility(prev => ({ ...prev, internet: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [navigate, user]);

  const handlePrerequisiteOpen = () => {
    if (!interviewData.position.trim()) return showToast('Please enter the target role.');
    if (!interviewData.termsAccepted) return showToast('Please accept the terms to continue.');
    setIsPrereqOpen(true);
  };

  const runCompatibilityCheck = async () => {
    setIsCheckingDevices(true);
    let micOk = false;
    let camOk = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      micOk = true;
      camOk = true;
      stream.getTracks().forEach(track => track.stop());
    } catch {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micOk = true;
        micStream.getTracks().forEach(track => track.stop());
      } catch {}

      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        camOk = true;
        camStream.getTracks().forEach(track => track.stop());
      } catch {}
    }

    setCompatibility(prev => ({ ...prev, microphone: micOk, camera: camOk }));
    setIsCheckingDevices(false);
  };

  const playAudioSample = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Audio preview is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('This is your interview audio check. If you can hear this, mark audio as working.');
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    setDidPlayAudioSample(true);
  };

  const markAudioCheck = (isWorking) => {
    setCompatibility(prev => ({ ...prev, audio: isWorking }));
  };

  const handleStartInterview = async () => {
    if (!user?.id) {
      showToast('Session expired. Please login again.');
      navigate('/');
      return;
    }

    try {
      setIsStarting(true);
      const response = await axios.post(`${API_BASE_URL}/api/interview/start`, {
        userId: user.id,
        position: interviewData.position,
        experience: interviewData.experience,
        difficulty: interviewData.round
      });
      navigate(`/interview/${response.data.interviewId}`);
    } catch {
      showToast('Error starting interview. Server might be down.');
      setIsStarting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const handleAuthAction = () => {
    if (user) {
      handleLogout();
      return;
    }
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const canStart = compatibility.microphone && compatibility.internet && compatibility.audio;

  const handleQuickRolePick = (roleTitle) => {
    setInterviewData((prev) => ({ ...prev, position: roleTitle }));
    showToast(`Selected role: ${roleTitle}`);
  };

  return (
    <div style={styles.container} className="dashboard-shell">
      {toast && <div style={styles.toast} className="animate-slide-up">{toast}</div>}

      <div style={styles.pageLayout} className="dashboard-layout">
        <aside style={{ ...styles.sidebar, ...(isSidebarOpen ? {} : styles.sidebarCollapsed) }} className="glass-panel dashboard-sidebar">
          <div style={styles.sidebarTop}>
            <div style={styles.logoIndicator}></div>
            {isSidebarOpen && <span style={styles.brandName}>AI Studio</span>}
            <button style={styles.sidebarToggleBtn} onClick={() => setIsSidebarOpen(prev => !prev)}>
              {isSidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <button style={styles.sidebarButton} onClick={handleProfileClick}>{isSidebarOpen ? 'Profile' : '👤'}</button>
          <button style={styles.sidebarButton} onClick={() => navigate('/history')}>{isSidebarOpen ? 'History' : '🕘'}</button>
          <button style={styles.sidebarButton} onClick={handleAuthAction}>{isSidebarOpen ? (user ? 'Logout' : 'Login') : (user ? '🚪' : '🔐')}</button>

          <div style={styles.sidebarFooter}>
            {isSidebarOpen && <span style={styles.userName}>{user?.firstName || 'Guest'}</span>}
          </div>
        </aside>

        <div style={styles.contentArea} className="dashboard-content">
          <nav style={styles.nav} className="glass-panel">
            <div style={styles.navLeft}>
              <div style={styles.navBrand}>
                <h2 style={styles.navTitle}>AI Interview Preparation Studio</h2>
                <p style={styles.navSubtitle}>Role-specific practice with instant feedback reports.</p>
              </div>
              <div style={styles.navLinks}>
                <button style={styles.navLinkBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
                <button style={styles.navLinkBtn} onClick={() => navigate('/history')}>History</button>
                <button style={styles.navLinkBtn} onClick={() => navigate('/profile')}>Profile</button>
              </div>
            </div>
            <div style={styles.navRight}>
              <button style={styles.navPrimaryBtn} onClick={handlePrerequisiteOpen}>Start Interview</button>
            </div>
          </nav>

          <div style={styles.mainLayout}>
            <div style={styles.headerArea}>
              <span style={styles.heroBadge}>3000+ role scenarios available</span>
              <h1 style={styles.mainTitle}>Role-Specific AI Mock Interviews</h1>
              <p style={styles.mainSubtitle}>Pick a role, customize your setup, and enter a guided mock interview in seconds.</p>
            </div>

            <div style={styles.configCard} className="glass-panel animate-slide-up">
              <h3 style={styles.configTitle}>Session Configuration</h3>
              <div style={styles.grid2}>
                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Target Role</label>
                  <input
                    type="text"
                    value={interviewData.position}
                    onChange={(e) => setInterviewData({ ...interviewData, position: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Experience Level</label>
                  <select
                    value={interviewData.experience}
                    onChange={(e) => setInterviewData({ ...interviewData, experience: e.target.value })}
                    style={styles.input}
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="1-2 years">1-2 years</option>
                    <option value="3-5 years">3-5 years</option>
                  </select>
                </div>
              </div>

              <div style={styles.section}>
                <label style={styles.label}>Interview Round</label>
                <div style={styles.chipGroup}>
                  {rounds.map(r => (
                    <button
                      key={r}
                      onClick={() => setInterviewData({ ...interviewData, round: r })}
                      style={{ ...styles.chip, ...(interviewData.round === r ? styles.chipActive : {}) }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <label style={styles.label}>Duration</label>
                <div style={styles.chipGroup}>
                  {durations.map(d => (
                    <button
                      key={d}
                      onClick={() => setInterviewData({ ...interviewData, duration: d })}
                      style={{ ...styles.chip, ...(interviewData.duration === d ? styles.chipActive : {}) }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <label style={styles.label}>Select Persona</label>
                <div style={styles.personaGrid}>
                  {interviewers.map(i => (
                    <div
                      key={i.name}
                      onClick={() => setInterviewData({ ...interviewData, interviewer: i.name })}
                      style={{ ...styles.personaCard, ...(interviewData.interviewer === i.name ? styles.personaCardActive : {}) }}
                    >
                      <div style={styles.personaIcon}>{i.icon}</div>
                      <div>
                        <div style={styles.personaName}>{i.name}</div>
                        <div style={styles.personaType}>{i.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.footer}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={interviewData.termsAccepted}
                    onChange={(e) => setInterviewData({ ...interviewData, termsAccepted: e.target.checked })}
                  />
                  <span style={styles.checkboxText}>I accept the session recording policies.</span>
                </label>
                <button style={styles.launchBtn} onClick={handlePrerequisiteOpen}>Launch Environment</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isPrereqOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel animate-slide-up">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>System Check</h3>
              <button style={styles.closeBtn} onClick={() => setIsPrereqOpen(false)}>X</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.checkRow}>
                <span style={styles.checkName}>Network Connectivity</span>
                <span style={compatibility.internet ? styles.statusGood : styles.statusBad}>{compatibility.internet ? 'Online' : 'Offline'}</span>
              </div>
              <div style={styles.checkRow}>
                <span style={styles.checkName}>Microphone Access</span>
                <span style={compatibility.microphone ? styles.statusGood : styles.statusBad}>{compatibility.microphone ? 'Granted' : 'Pending'}</span>
              </div>
              <div style={styles.checkRow}>
                <span style={styles.checkName}>Camera Access (Optional)</span>
                <span style={compatibility.camera ? styles.statusGood : styles.statusBad}>{compatibility.camera ? 'Granted' : 'Pending'}</span>
              </div>

              <button style={styles.testBtn} onClick={runCompatibilityCheck} disabled={isCheckingDevices}>
                {isCheckingDevices ? 'Analyzing...' : 'Run Diagnostics'}
              </button>

              <button style={styles.testBtn} onClick={playAudioSample}>Play Audio Sample</button>

              {didPlayAudioSample && (
                <div style={styles.audioCheckRow}>
                  <button style={styles.audioYesBtn} onClick={() => markAudioCheck(true)}>I heard it</button>
                  <button style={styles.audioNoBtn} onClick={() => markAudioCheck(false)}>Did not hear</button>
                </div>
              )}

              <button
                style={{ ...styles.finalStartBtn, opacity: canStart ? 1 : 0.5 }}
                disabled={!canStart || isStarting}
                onClick={handleStartInterview}
              >
                {isStarting ? 'Initializing Virtual Room...' : 'Enter Interview Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', width: '100%', minHeight: '100vh' },
  pageLayout: { display: 'flex', gap: '20px', maxWidth: '1440px', margin: '0 auto' },
  sidebar: { width: '260px', minHeight: 'calc(100vh - 48px)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'sticky', top: '24px' },
  sidebarCollapsed: { width: '84px', padding: '20px 10px' },
  sidebarTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  sidebarToggleBtn: { marginLeft: 'auto', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer' },
  sidebarButton: { width: '100%', textAlign: 'left', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '10px', padding: '13px 14px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border)' },
  contentArea: { flex: 1, minWidth: 0 },
  toast: { position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: 'var(--text-primary)', color: 'var(--surface-solid)', padding: '12px 24px', borderRadius: '30px', zIndex: 2000, fontWeight: '700', fontSize: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
  nav: { padding: '18px 20px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' },
  navLeft: { display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' },
  navBrand: { display: 'flex', flexDirection: 'column', gap: '4px' },
  navTitle: { margin: 0, fontSize: '24px', color: 'var(--text-primary)' },
  navSubtitle: { margin: 0, color: 'var(--text-secondary)', fontSize: '15px' },
  navLinks: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  navLinkBtn: { border: '1px solid var(--border)', background: 'var(--surface-solid)', color: 'var(--text-primary)', borderRadius: '999px', padding: '9px 15px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  navRight: { marginLeft: 'auto' },
  navPrimaryBtn: { border: 'none', background: 'linear-gradient(135deg, var(--primary), #7c3aed)', color: 'white', borderRadius: '999px', padding: '11px 20px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 22px rgba(99, 102, 241, 0.35)', fontSize: '15px' },
  logoIndicator: { width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' },
  brandName: { fontSize: '20px', fontWeight: '700', letterSpacing: '1px' },
  userName: { fontWeight: '600', color: 'var(--text-primary)' },
  mainLayout: { marginTop: '8px' },
  headerArea: { marginBottom: '24px', textAlign: 'center', maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' },
  heroBadge: { display: 'inline-block', marginBottom: '14px', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(99, 102, 241, 0.14)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.24)', borderRadius: '999px', padding: '7px 14px', fontWeight: '800' },
  mainTitle: { fontSize: 'clamp(2.3rem, 4vw, 4rem)', lineHeight: 1.08, fontWeight: '800', marginBottom: '12px', color: 'var(--text-primary)' },
  mainSubtitle: { color: 'var(--text-secondary)', fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', maxWidth: '760px', margin: '0 auto 8px auto', lineHeight: 1.7 },
  configCard: { padding: '30px' },
  configTitle: { fontSize: '24px', marginBottom: '20px', color: 'var(--text-primary)' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '22px', marginBottom: '24px' },
  inputWrapper: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)' },
  input: { padding: '15px', borderRadius: '12px', fontSize: '16px', color: 'var(--text-primary)' },
  section: { marginBottom: '30px' },
  chipGroup: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' },
  chip: { padding: '11px 20px', borderRadius: '30px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600', fontSize: '15px', transition: 'all 0.2s' },
  chipActive: { background: 'var(--primary)', borderColor: 'var(--primary)', color: 'white', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
  personaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '10px' },
  personaCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' },
  personaCardActive: { borderColor: 'var(--primary)', background: 'rgba(99,102,241,0.08)' },
  personaIcon: { fontSize: '16px', fontWeight: '700', minWidth: '52px' },
  personaName: { fontWeight: '700', fontSize: '17px', color: 'var(--text-primary)' },
  personaType: { fontSize: '14px', color: 'var(--text-secondary)' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  checkboxText: { fontSize: '15px', color: 'var(--text-secondary)' },
  launchBtn: { background: 'var(--text-primary)', color: 'var(--surface-solid)', padding: '15px 28px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.2s' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { width: '100%', maxWidth: '520px', padding: '24px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  modalTitle: { fontSize: '22px', fontWeight: '800' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' },
  checkRow: { display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '16px 0', borderBottom: '1px solid var(--border)', fontSize: '15px' },
  checkName: { fontWeight: '600', color: 'var(--text-primary)' },
  statusGood: { color: 'var(--success)', fontWeight: '700' },
  statusBad: { color: 'var(--danger)', fontWeight: '700' },
  testBtn: { width: '100%', padding: '13px', marginTop: '22px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer', fontSize: '15px' },
  finalStartBtn: { width: '100%', padding: '17px', marginTop: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--primary), #a855f7)', color: 'white', fontWeight: '800', fontSize: '16px', cursor: 'pointer', transition: 'all 0.3s' },
  audioCheckRow: { display: 'flex', gap: '10px', marginTop: '12px' },
  audioYesBtn: { flex: 1, border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '10px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  audioNoBtn: { flex: 1, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '10px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }
};

export default Dashboard;
