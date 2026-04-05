import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

function Report() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    axios.post(`${API_BASE_URL}/api/interview/report/${interviewId}`)
      .then(res => {
        setReport(res.data.report);
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage(error.response?.data?.message || 'Unable to load report right now.');
      })
      .finally(() => setLoading(false));
  }, [interviewId, navigate]);

  if (loading) return <div style={styles.loader}><div style={styles.spinner}></div></div>;

  if (!report) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Analysis Report</h1>
          <div style={styles.headerActions}>
            <button style={styles.homeBtn} onClick={() => navigate('/dashboard')}>Home</button>
            <button style={styles.backBtn} onClick={() => navigate('/history')}>Back</button>
          </div>
        </div>
        <div style={styles.errorCard} className="glass-panel">
          <h3 style={styles.sectionTitle}>Report Not Available</h3>
          <p style={styles.errorText}>{errorMessage || 'Something went wrong while loading report.'}</p>
          <div style={styles.errorActions}>
            <button style={styles.homeBtn} onClick={() => navigate('/dashboard')}>Go Home</button>
            <button style={styles.backBtn} onClick={() => navigate('/history')}>Go to History</button>
          </div>
        </div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference - (report.overallScore / 100) * circumference;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Analysis Report</h1>
        <div style={styles.headerActions}>
          <button style={styles.homeBtn} onClick={() => navigate('/dashboard')}>Home</button>
          <button style={styles.backBtn} onClick={() => navigate('/history')}>Back</button>
        </div>
      </div>

      <div style={styles.topGrid}>
        <div style={styles.scoreCard} className="glass-panel animate-slide-up">
          <div style={styles.svgWrapper}>
            <svg width="160" height="160" style={{transform: 'rotate(-90deg)'}}>
              <circle cx="80" cy="80" r="60" fill="none" stroke="var(--border)" strokeWidth="12" />
              <circle cx="80" cy="80" r="60" fill="none" stroke="var(--primary)" strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{transition: 'stroke-dashoffset 1.5s ease-in-out'}} />
            </svg>
            <div style={styles.scoreOverlay}>
              <span style={styles.scoreNum}>{report.overallScore}</span>
              <span style={styles.scoreMax}>/100</span>
            </div>
          </div>
          <h2 style={styles.perfLevel}>{report.performanceLevel}</h2>
        </div>

        <div style={{...styles.detailsCard, animationDelay: '0.1s'}} className="glass-panel animate-slide-up">
          <h3 style={styles.sectionTitle}>Session Details</h3>
          <div style={styles.detailGrid}>
            <div style={styles.dItem}><span style={styles.dLabel}>Role</span><span style={styles.dVal}>{report.position}</span></div>
            <div style={styles.dItem}><span style={styles.dLabel}>Level</span><span style={styles.dVal}>{report.difficulty}</span></div>
            <div style={styles.dItem}><span style={styles.dLabel}>Questions</span><span style={styles.dVal}>{report.questionsAsked}</span></div>
            <div style={styles.dItem}><span style={styles.dLabel}>Duration</span><span style={styles.dVal}>{report.interviewDuration}</span></div>
          </div>
        </div>
      </div>

      <div style={{...styles.metricsCard, animationDelay: '0.2s'}} className="glass-panel animate-slide-up">
        <h3 style={styles.sectionTitle}>Competency Breakdown</h3>
        <div style={styles.barGrid}>
          {[ {l: 'Technical', s: report.technicalScore}, {l: 'Communication', s: report.communicationScore}, {l: 'Confidence', s: report.confidenceScore}, {l: 'Problem Solving', s: report.problemSolvingScore} ].map(m => (
            <div key={m.l} style={styles.barWrapper}>
              <div style={styles.barLabelGroup}><span>{m.l}</span><span>{m.s}%</span></div>
              <div style={styles.barBg}>
                <div style={{...styles.barFill, width: `${m.s}%`}}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.feedbackGrid}>
        <div style={{...styles.feedCard, animationDelay: '0.3s'}} className="glass-panel animate-slide-up">
          <h3 style={styles.sectionTitle}>Strengths</h3>
          <ul style={styles.list}>
            {report.strengths.map((s, i) => <li key={i} style={styles.li}>✓ {s}</li>)}
          </ul>
        </div>
        <div style={{...styles.feedCard, animationDelay: '0.4s'}} className="glass-panel animate-slide-up">
          <h3 style={styles.sectionTitle}>Areas for Growth</h3>
          <ul style={styles.list}>
            {report.weaknesses.map((w, i) => <li key={i} style={styles.li}>→ {w}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px', maxWidth: '1000px', margin: '0 auto', paddingTop: '80px', paddingBottom: '80px' },
  loader: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  spinner: { width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  headerActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  title: { fontSize: '32px', fontWeight: '700' },
  homeBtn: { background: 'var(--primary)', border: '1px solid var(--primary)', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  backBtn: { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  topGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' },
  scoreCard: { padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  svgWrapper: { position: 'relative', width: '160px', height: '160px', marginBottom: '16px' },
  scoreOverlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' },
  scoreNum: { fontSize: '40px', fontWeight: '700', lineHeight: 1 },
  scoreMax: { color: 'var(--text-secondary)', fontSize: '14px' },
  perfLevel: { fontSize: '20px', fontWeight: '600', color: 'var(--primary)' },
  detailsCard: { padding: '32px' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-primary)' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  dItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  dLabel: { color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', fontWeight: '600' },
  dVal: { fontSize: '16px', fontWeight: '500' },
  metricsCard: { padding: '32px', marginBottom: '24px' },
  barGrid: { display: 'grid', gap: '20px' },
  barLabelGroup: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '600' },
  barBg: { height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, var(--primary), #a855f7)', borderRadius: '4px' },
  feedbackGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  feedCard: { padding: '32px' },
  list: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' },
  li: { lineHeight: '1.6', color: 'var(--text-secondary)', display: 'flex', gap: '8px' },
  errorCard: { padding: '28px' },
  errorText: { color: 'var(--text-secondary)', marginBottom: '20px' },
  errorActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' }
};

export default Report;