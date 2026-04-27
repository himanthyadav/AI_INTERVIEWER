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
  const durations = ['1 min', '5 mins', '15 mins', '30 mins'];
  const interviewers = [
    { name: 'Ira', type: 'IN Accent', icon: 'Ira' },
    { name: 'Kapil', type: 'IN Accent', icon: 'Kapil' },
    { name: 'Rishab', type: 'IN Accent', icon: 'Rishab' }
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
        } else {
          showToast('Unable to start guest session. Please try again.');
        }
      } catch {
        showToast('Unable to start guest session. Please try again.');
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
        difficulty: interviewData.round,
        duration: interviewData.duration
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

  if (isBootstrappingUser) {
    return (
      <div style={styles.loaderWrap}>
        <div className="spinner" style={styles.loaderSpinner}></div>
      </div>
    );
  }

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
                <h2 style={styles.navTitle}>AI Interview Studio</h2>
                <p style={styles.navSubtitle}>Fast mock sessions.</p>
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
              <span style={styles.heroBadge}>3000+ roles</span>
              <h1 style={styles.mainTitle}>AI Mock Interviews</h1>
              <p style={styles.mainSubtitle}>Choose role, level, and round.</p>
            </div>

            <div style={styles.configCard} className="glass-panel animate-slide-up">
              <h3 style={styles.configTitle}>Setup</h3>
              <div style={styles.grid2}>
                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Role</label>
                  <input
                    type="text"
                    value={interviewData.position}
                    onChange={(e) => setInterviewData({ ...interviewData, position: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Experience</label>
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
                <label style={styles.label}>Round</label>
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
                <label style={styles.label}>Time</label>
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
                <label style={styles.label}>Coach</label>
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
                  <span style={styles.checkboxText}>I accept recording.</span>
                </label>
                <button style={styles.launchBtn} onClick={handlePrerequisiteOpen}>Launch Environment</button>
              </div>
            </div>

            <div style={styles.overviewGrid}>
              <div style={{ ...styles.overviewCard, ...styles.overviewCardHighlight }} className="glass-panel animate-slide-up">
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionBadge}>01</span>
                  <div>
                    <h3 style={styles.overviewTitle}>How to continue</h3>
                    <p style={styles.sectionSubtitle}>Follow this flow during class or while demonstrating the app.</p>
                  </div>
                </div>
                <div style={styles.stepList}>
                  <div style={styles.stepItem}><span style={styles.stepNumber}>1</span><p style={styles.stepText}>Set your role, experience, round, and time.</p></div>
                  <div style={styles.stepItem}><span style={styles.stepNumber}>2</span><p style={styles.stepText}>Pick a coach and accept recording.</p></div>
                  <div style={styles.stepItem}><span style={styles.stepNumber}>3</span><p style={styles.stepText}>Run the quick device check.</p></div>
                  <div style={styles.stepItem}><span style={styles.stepNumber}>4</span><p style={styles.stepText}>Start the interview and review the report later.</p></div>
                </div>
              </div>

              <div style={{ ...styles.overviewCard, ...styles.overviewCardHighlight, animationDelay: '0.08s' }} className="glass-panel animate-slide-up">
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionBadge}>02</span>
                  <div>
                    <h3 style={styles.overviewTitle}>Unique features</h3>
                    <p style={styles.sectionSubtitle}>These are the parts that make your project stand out.</p>
                  </div>
                </div>
                <p style={styles.overviewText}>This app is designed to feel more like a personal interview coach than a simple question bot.</p>
                <div style={styles.infoBlock}>
                  <h4 style={styles.infoBlockTitle}>What you get</h4>
                  <ul style={styles.infoList}>
                    <li style={styles.infoListItem}>Interview memory across sessions to track weak topics and repeated mistakes.</li>
                    <li style={styles.infoListItem}>Weakness-to-practice roadmap with next-step improvement tasks.</li>
                    <li style={styles.infoListItem}>Live answer rewrite support for clearer, more structured responses.</li>
                    <li style={styles.infoListItem}>Company-style interview modes such as startup, MNC, product-based, HR-heavy, or technical-heavy.</li>
                    <li style={styles.infoListItem}>Confidence and filler-word analytics for speaking-style feedback.</li>
                    <li style={styles.infoListItem}>Interview replay timeline to review question flow, pauses, and score changes.</li>
                  </ul>
                </div>
              </div>

              <div style={{ ...styles.overviewCard, ...styles.overviewCardHighlight, animationDelay: '0.16s' }} className="glass-panel animate-slide-up">
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionBadge}>03</span>
                  <div>
                    <h3 style={styles.overviewTitle}>Why it is different</h3>
                    <p style={styles.sectionSubtitle}>Use this part to explain it clearly in class.</p>
                  </div>
                </div>
                <p style={styles.overviewText}>Most AI interviewer platforms stop at asking questions and giving a score. This one keeps helping after the session ends.</p>
                <div style={styles.infoBlock}>
                  <h4 style={styles.infoBlockTitle}>Compared with other platforms</h4>
                  <ul style={styles.infoList}>
                    <li style={styles.infoListItem}>Remembers your progress across sessions instead of treating every interview as a one-time chat.</li>
                    <li style={styles.infoListItem}>Turns feedback into a roadmap, not just a score card.</li>
                    <li style={styles.infoListItem}>Gives answer rewrite help and speaking analytics, which most platforms skip.</li>
                    <li style={styles.infoListItem}>Supports replay and review so improvement is visible, not hidden.</li>
                  </ul>
                </div>
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
  loaderWrap: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  loaderSpinner: { width: '42px', height: '42px', border: '4px solid #e0e7ff', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  container: { padding: '20px', width: '100%', minHeight: '100vh' },
  pageLayout: { display: 'flex', gap: '20px', maxWidth: '1440px', margin: '0 auto' },
  sidebar: { width: '260px', minHeight: 'calc(100vh - 48px)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'sticky', top: '24px' },
  sidebarCollapsed: { width: '84px', padding: '20px 10px' },
  sidebarTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  sidebarToggleBtn: { marginLeft: 'auto', borderTop: '2px solid rgba(255,255,255,0.9)', borderLeft: '2px solid rgba(255,255,255,0.8)', borderBottom: '2px solid rgba(99,102,241,0.2)', borderRight: '2px solid rgba(99,102,241,0.15)', background: '#fff', color: '#6366f1', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(99,102,241,0.1)', fontWeight: '700' },
  sidebarButton: { width: '100%', textAlign: 'left', background: '#fff', borderTop: '2px solid rgba(255,255,255,0.95)', borderLeft: '2px solid rgba(255,255,255,0.85)', borderBottom: '2px solid rgba(99,102,241,0.18)', borderRight: '2px solid rgba(99,102,241,0.12)', color: '#0f172a', borderRadius: '12px', padding: '13px 14px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', boxShadow: '2px 2px 0 rgba(99,102,241,0.08), 0 3px 8px rgba(99,102,241,0.07)', transition: 'all 0.2s' },
  sidebarFooter: { marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid rgba(99,102,241,0.15)' },
  contentArea: { flex: 1, minWidth: 0 },
  toast: { position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#ffffff', padding: '12px 24px', borderRadius: '30px', zIndex: 2000, fontWeight: '700', fontSize: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)' },
  nav: { padding: '18px 20px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' },
  navLeft: { display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' },
  navBrand: { display: 'flex', flexDirection: 'column', gap: '4px' },
  navTitle: { margin: 0, fontSize: '24px', color: '#0f172a', fontWeight: '800' },
  navSubtitle: { margin: 0, color: '#64748b', fontSize: '14px' },
  navLinks: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  navLinkBtn: { borderTop: '2px solid rgba(255,255,255,0.95)', borderLeft: '2px solid rgba(255,255,255,0.85)', borderBottom: '2px solid rgba(99,102,241,0.18)', borderRight: '2px solid rgba(99,102,241,0.12)', background: '#fff', color: '#0f172a', borderRadius: '999px', padding: '9px 15px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(99,102,241,0.08)', transition: 'all 0.2s' },
  navRight: { marginLeft: 'auto' },
  navPrimaryBtn: { border: 'none', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white', borderRadius: '999px', padding: '11px 20px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 20px rgba(99,102,241,0.38), 3px 3px 0 rgba(79,70,229,0.25)', fontSize: '15px', transition: 'all 0.2s' },
  logoIndicator: { width: '12px', height: '12px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 10px rgba(99,102,241,0.5)' },
  brandName: { fontSize: '20px', fontWeight: '700', letterSpacing: '1px', color: '#6366f1' },
  userName: { fontWeight: '600', color: '#0f172a' },
  mainLayout: { marginTop: '8px' },
  headerArea: { marginBottom: '24px', textAlign: 'center', maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' },
  heroBadge: { display: 'inline-block', marginBottom: '14px', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(99,102,241,0.1)', color: '#6366f1', borderTop: '1px solid rgba(255,255,255,0.9)', borderLeft: '1px solid rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(99,102,241,0.2)', borderRight: '1px solid rgba(99,102,241,0.15)', borderRadius: '999px', padding: '7px 14px', fontWeight: '800', boxShadow: '1px 1px 0 rgba(99,102,241,0.1)' },
  mainTitle: { fontSize: 'clamp(2.3rem, 4vw, 4rem)', lineHeight: 1.08, fontWeight: '800', marginBottom: '12px', color: '#0f172a' },
  mainSubtitle: { color: '#64748b', fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', maxWidth: '760px', margin: '0 auto 8px auto', lineHeight: 1.7 },
  overviewGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '18px', marginTop: '24px', marginBottom: '24px' },
  overviewCard: { padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' },
  overviewCardHighlight: { position: 'relative', overflow: 'hidden' },
  sectionHeader: { display: 'flex', alignItems: 'flex-start', gap: '14px' },
  sectionBadge: { width: '44px', height: '44px', borderRadius: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white', fontWeight: '800', fontSize: '15px', boxShadow: '4px 4px 0 rgba(99,102,241,0.16)' },
  sectionSubtitle: { margin: '4px 0 0', color: '#64748b', fontSize: '14px', lineHeight: 1.5 },
  overviewTitle: { margin: 0, fontSize: '22px', color: '#0f172a', fontWeight: '800' },
  overviewText: { margin: 0, color: '#64748b', fontSize: '15px', lineHeight: 1.7 },
  stepList: { display: 'grid', gap: '10px' },
  stepItem: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  stepNumber: { width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white', fontWeight: '800', fontSize: '13px', boxShadow: '3px 3px 0 rgba(99,102,241,0.18)' },
  stepText: { margin: 0, color: '#0f172a', fontSize: '15px', lineHeight: 1.6 },
  infoBlock: { display: 'flex', flexDirection: 'column', gap: '10px' },
  infoBlockTitle: { margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: '800' },
  infoList: { margin: 0, paddingLeft: '18px', display: 'grid', gap: '8px' },
  infoListItem: { color: '#64748b', fontSize: '14px', lineHeight: 1.6 },
  configCard: { padding: '30px' },
  configTitle: { fontSize: '24px', marginBottom: '20px', color: '#0f172a', fontWeight: '800' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '22px', marginBottom: '24px' },
  inputWrapper: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '15px', fontWeight: '700', color: '#64748b' },
  input: { padding: '15px', borderRadius: '12px', fontSize: '16px', color: '#0f172a', width: '100%' },
  section: { marginBottom: '30px' },
  chipGroup: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' },
  chip: { padding: '11px 20px', borderRadius: '30px', borderTop: '2px solid rgba(255,255,255,0.95)', borderLeft: '2px solid rgba(255,255,255,0.85)', borderBottom: '2px solid rgba(99,102,241,0.18)', borderRight: '2px solid rgba(99,102,241,0.12)', background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: '600', fontSize: '15px', boxShadow: '2px 2px 0 rgba(99,102,241,0.08)', transition: 'all 0.18s' },
  chipActive: { background: 'linear-gradient(135deg, #6366f1, #7c3aed)', borderColor: '#6366f1', color: 'white', boxShadow: '3px 3px 0 rgba(79,70,229,0.25), 0 4px 14px rgba(99,102,241,0.3)', borderTop: '2px solid #818cf8', borderLeft: '2px solid #818cf8', borderBottom: '2px solid #4f46e5', borderRight: '2px solid #4f46e5' },
  personaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '10px' },
  personaCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '18px', borderRadius: '16px', borderTop: '2px solid rgba(255,255,255,0.95)', borderLeft: '2px solid rgba(255,255,255,0.85)', borderBottom: '2px solid rgba(99,102,241,0.18)', borderRight: '2px solid rgba(99,102,241,0.12)', background: '#fff', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(99,102,241,0.08)', transition: 'all 0.2s' },
  personaCardActive: { borderTop: '2px solid #a5b4fc', borderLeft: '2px solid #a5b4fc', borderBottom: '2px solid #6366f1', borderRight: '2px solid #6366f1', background: 'rgba(99,102,241,0.06)', boxShadow: '3px 3px 0 rgba(99,102,241,0.14)' },
  personaIcon: { fontSize: '16px', fontWeight: '700', minWidth: '52px', color: '#6366f1' },
  personaName: { fontWeight: '700', fontSize: '17px', color: '#0f172a' },
  personaType: { fontSize: '14px', color: '#64748b' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(99,102,241,0.15)', flexWrap: 'wrap' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  checkboxText: { fontSize: '15px', color: '#64748b' },
  launchBtn: { background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#ffffff', padding: '15px 28px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(15,23,42,0.2), 0 8px 20px rgba(15,23,42,0.18)', transition: 'transform 0.2s' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { width: '100%', maxWidth: '520px', padding: '24px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  modalTitle: { fontSize: '22px', fontWeight: '800', color: '#0f172a' },
  closeBtn: { background: '#fff', border: '1px solid rgba(99,102,241,0.2)', color: '#64748b', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', padding: '6px 12px', fontWeight: '700' },
  checkRow: { display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '16px 0', borderBottom: '1px solid rgba(99,102,241,0.12)', fontSize: '15px' },
  checkName: { fontWeight: '600', color: '#0f172a' },
  statusGood: { color: '#10b981', fontWeight: '700' },
  statusBad: { color: '#ef4444', fontWeight: '700' },
  testBtn: { width: '100%', padding: '13px', marginTop: '22px', borderRadius: '10px', borderTop: '2px solid rgba(255,255,255,0.95)', borderLeft: '2px solid rgba(255,255,255,0.85)', borderBottom: '2px solid rgba(99,102,241,0.2)', borderRight: '2px solid rgba(99,102,241,0.15)', background: '#fff', color: '#0f172a', fontWeight: '700', cursor: 'pointer', fontSize: '15px', boxShadow: '2px 2px 0 rgba(99,102,241,0.1)' },
  finalStartBtn: { width: '100%', padding: '17px', marginTop: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(79,70,229,0.25), 0 8px 20px rgba(99,102,241,0.3)', transition: 'all 0.25s' },
  audioCheckRow: { display: 'flex', gap: '10px', marginTop: '12px' },
  audioYesBtn: { flex: 1, borderTop: '2px solid rgba(255,255,255,0.9)', borderLeft: '2px solid rgba(255,255,255,0.8)', borderBottom: '2px solid rgba(16,185,129,0.35)', borderRight: '2px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)', color: '#10b981', padding: '10px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(16,185,129,0.1)' },
  audioNoBtn:  { flex: 1, borderTop: '2px solid rgba(255,255,255,0.9)', borderLeft: '2px solid rgba(255,255,255,0.8)', borderBottom: '2px solid rgba(239,68,68,0.3)', borderRight: '2px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', padding: '10px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(239,68,68,0.1)' }
};

export default Dashboard;
