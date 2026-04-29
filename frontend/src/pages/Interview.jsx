import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

function Interview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState('voice');
  const [textInput, setTextInput] = useState('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isEnding, setIsEnding] = useState(false);
  
  const socketRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isMutedRef = useRef(false);
  const stopRequestedRef = useRef(false);

  const parseDurationToSeconds = (durationText) => {
    const normalized = String(durationText || '').toLowerCase().trim();

    if (normalized.includes('1 min')) return 60;
    if (normalized.includes('5 mins')) return 5 * 60;
    if (normalized.includes('15 mins')) return 15 * 60;
    if (normalized.includes('30 mins')) return 30 * 60;

    return 15 * 60;
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const handleAutoStop = async () => {
    if (isEnding) return;

    setIsEnding(true);
    try {
      await axios.post(`${API_BASE_URL}/api/interview/stop/${interviewId}`);
    } catch {}

    window.speechSynthesis?.cancel();
    navigate('/history');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted) {
      window.speechSynthesis?.cancel();
      setIsAISpeaking(false);
    }
  }, [isMuted]);

  useEffect(() => {
    socketRef.current = io(API_BASE_URL, { reconnection: true });
    socketRef.current.emit('join-interview', { interviewId });

    socketRef.current.on('ai-response', (data) => {
      setMessages(prev => [...prev, { role: 'ai', text: data.message }]);
      speakText(data.message);
    });

    socketRef.current.on('error', (data) => {
      const errorText = data?.message || 'Unable to generate response right now.';
      setMessages(prev => [...prev, { role: 'ai', text: errorText }]);
    });

    socketRef.current.on('interview-ended', async () => {
      try {
        window.speechSynthesis?.cancel();
        navigate('/history');
      } catch {}
    });

    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessages(prev => [...prev, { role: 'user', text: transcript }]);
        socketRef.current.emit('user-message', { interviewId, message: transcript });
        setIsRecording(false);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
    }

    return () => {
      socketRef.current?.disconnect();
      window.speechSynthesis?.cancel();
    };
  }, [interviewId]);

  useEffect(() => {
    const loadInterview = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/interview/${interviewId}`);
        const interview = response.data?.interview;
        setTimeLeft(parseDurationToSeconds(interview?.duration));
      } catch {
        setTimeLeft(15 * 60);
      }
    };

    loadInterview();
  }, [interviewId]);

  useEffect(() => {
    if (isEnding || timeLeft <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timerId);
          if (!stopRequestedRef.current) {
            stopRequestedRef.current = true;
            handleAutoStop();
          }
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [timeLeft, isEnding]);

  const speakText = (text) => {
    if (isMutedRef.current) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setIsAISpeaking(true);
    utterance.onend = () => setIsAISpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = () => {
    if (!recognitionRef.current) return;
    setIsRecording(true);
    try { recognitionRef.current.start(); } catch {}
  };

  const sendTextMessage = () => {
    if (!textInput.trim() || !socketRef.current) return;
    setMessages(prev => [...prev, { role: 'user', text: textInput }]);
    socketRef.current.emit('user-message', { interviewId, message: textInput });
    setTextInput('');
  };

  const handleStop = async () => {
    if (isEnding) return;

    stopRequestedRef.current = true;
    setIsEnding(true);
    try {
      await axios.post(`${API_BASE_URL}/api/interview/stop/${interviewId}`);
    } catch {}

    window.speechSynthesis?.cancel();
    navigate('/history');
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      window.speechSynthesis?.cancel();
    }
    setIsMuted(prev => !prev);
  };

  return (
    <div style={styles.container} className="interview-shell">
      <div style={styles.topBar} className="glass-panel">
        <div style={styles.statusGroup}>
          <div style={styles.recordingDot}></div>
          <span style={styles.statusText}>Session Active</span>
        </div>
        <div style={styles.topActions}>
          <div style={styles.timerPill}>{formatTime(timeLeft)}</div>
          <button style={styles.muteBtn} onClick={handleToggleMute}>
            {isMuted ? 'Unmute AI' : 'Mute AI'}
          </button>
          <button style={styles.endBtn} onClick={handleStop}>End Session</button>
        </div>
      </div>

      <div style={styles.mainArea}>
        <div style={styles.visualizerPanel} className="glass-panel">
          <div style={styles.avatarRing} className={isAISpeaking ? 'recording-pulse' : ''}>
            <div style={styles.avatarInner}>AI</div>
          </div>
          <h2 style={styles.aiName}>Interviewer</h2>
          <p style={styles.aiStatus}>{isAISpeaking ? 'Speaking...' : 'Listening...'}</p>
        </div>

        <div style={styles.chatPanel} className="glass-panel">
          <div style={styles.chatScroll}>
            {messages.length === 0 && <div style={styles.emptyChat}>System initialized. Waiting for AI...</div>}
            {messages.map((msg, idx) => (
              <div key={idx} style={{...styles.msgBubble, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : '#ffffff', color: msg.role === 'user' ? '#fff' : '#0f172a', borderTop: msg.role === 'user' ? 'none' : '2px solid rgba(255,255,255,0.95)', borderLeft: msg.role === 'user' ? 'none' : '2px solid rgba(255,255,255,0.85)', borderBottom: msg.role === 'user' ? 'none' : '2px solid rgba(99,102,241,0.18)', borderRight: msg.role === 'user' ? 'none' : '2px solid rgba(99,102,241,0.12)', boxShadow: msg.role === 'user' ? '3px 3px 0 rgba(79,70,229,0.22), 0 6px 18px rgba(99,102,241,0.28)' : '2px 2px 0 rgba(99,102,241,0.08), 0 4px 12px rgba(99,102,241,0.07)'}} className={`animate-slide-up interview-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                <div style={{...styles.msgLabel, color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)'}}>
                  {msg.role === 'user' ? 'You' : 'AI'}
                </div>
                <div style={styles.msgText}>{msg.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.controlBox}>
            <div style={styles.tabs}>
              <button style={{...styles.tabBtn, opacity: inputMode === 'voice' ? 1 : 0.5}} onClick={() => setInputMode('voice')}>🎙️ Voice</button>
              <button style={{...styles.tabBtn, opacity: inputMode === 'text' ? 1 : 0.5}} onClick={() => setInputMode('text')}>⌨️ Text</button>
            </div>

            {inputMode === 'voice' ? (
              <button style={{...styles.micBtn, background: isRecording ? 'var(--danger)' : 'var(--primary)'}} className={isRecording ? 'recording-pulse' : ''} onClick={startRecording} disabled={isRecording}>
                {isRecording ? 'Recording...' : 'Tap to Speak'}
              </button>
            ) : (
              <div style={styles.inputRow}>
                <input
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendTextMessage()}
                  style={styles.chatInput}
                  placeholder="Type your answer..."
                  autoCorrect="on"
                  spellCheck="true"
                  autoCapitalize="sentences"
                  autoComplete="off"
                />
                <button style={styles.sendBtn} onClick={sendTextMessage}>Send</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px', maxWidth: '1400px', margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' },
  topActions: { display: 'flex', alignItems: 'center', gap: '10px' },
  timerPill: { minWidth: '76px', textAlign: 'center', padding: '9px 14px', borderRadius: '999px', background: 'rgba(91,93,246,0.10)', color: 'var(--primary)', fontWeight: '800', fontSize: '14px', boxShadow: '3px 3px 0 rgba(91,93,246,0.12)' },
  statusGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  recordingDot: { width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 10px rgba(239,68,68,0.6)', animation: 'pulse-ring 2s infinite' },
  statusText: { fontWeight: '600', color: 'var(--text-primary)' },
  muteBtn: { background: 'rgba(91,93,246,0.10)', color: 'var(--primary)', borderTop: '2px solid rgba(255,255,255,0.96)', borderLeft: '2px solid rgba(255,255,255,0.88)', borderBottom: '2px solid rgba(91,93,246,0.24)', borderRight: '2px solid rgba(124,58,237,0.18)', padding: '10px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(91,93,246,0.12)' },
  endBtn: { background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', borderTop: '2px solid rgba(255,255,255,0.96)', borderLeft: '2px solid rgba(255,255,255,0.88)', borderBottom: '2px solid rgba(239,68,68,0.30)', borderRight: '2px solid rgba(239,68,68,0.22)', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(239,68,68,0.12)' },
  mainArea: { display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' },
  visualizerPanel: { flex: '0 0 350px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px' },
  avatarRing: { width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(91,93,246,0.10)', borderTop: '3px solid rgba(255,255,255,0.98)', borderLeft: '3px solid rgba(255,255,255,0.9)', borderBottom: '3px solid rgba(91,93,246,0.34)', borderRight: '3px solid rgba(124,58,237,0.24)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px', boxShadow: '4px 4px 0 rgba(91,93,246,0.14), 0 12px 30px rgba(91,93,246,0.14)' },
  avatarInner: { width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '32px', fontWeight: '700', boxShadow: '0 12px 32px rgba(91,93,246,0.36)' },
  aiName: { fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' },
  aiStatus: { color: 'var(--text-secondary)' },
  chatPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatScroll: { flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  emptyChat: { margin: 'auto', color: 'var(--text-secondary)', fontStyle: 'italic' },
  msgBubble: { maxWidth: '80%', padding: '16px', borderRadius: '16px', lineHeight: '1.6' },
  msgLabel: { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' },
  msgText: { fontSize: '15px' },
  controlBox: { padding: '24px', borderTop: '1px solid rgba(91,93,246,0.18)' },
  tabs: { display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '20px' },
  tabBtn: { background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: '600', fontSize: '16px', cursor: 'pointer', transition: 'opacity 0.2s' },
  micBtn: { display: 'block', width: '100%', maxWidth: '300px', margin: '0 auto', padding: '16px', borderRadius: '30px', color: 'white', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '4px 4px 0 rgba(91,93,246,0.24), 0 10px 22px rgba(91,93,246,0.28)', transition: 'all 0.3s' },
  inputRow: { display: 'flex', gap: '12px' },
  chatInput: { flex: 1, padding: '16px', borderRadius: '12px' },
  sendBtn: { background: 'linear-gradient(135deg, var(--primary), var(--primary-strong))', color: 'white', border: 'none', padding: '0 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(91,93,246,0.2)' }
};

export default Interview;