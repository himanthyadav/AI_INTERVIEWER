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
  
  const socketRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isMutedRef = useRef(false);

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

    socketRef.current.on('interview-ended', () => {
      window.speechSynthesis?.cancel();
      navigate('/history');
    });

    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
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
  }, [interviewId, navigate]);

  const speakText = (text) => {
    if (isMutedRef.current || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onstart = () => setIsAISpeaking(true);
    u.onend = () => setIsAISpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const startRecording = () => {
    if (!recognitionRef.current) return;
    setIsRecording(true);
    try { recognitionRef.current.start(); } catch {}
  };

  const sendText = () => {
    if (!textInput.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: textInput }]);
    socketRef.current.emit('user-message', { interviewId, message: textInput });
    setTextInput('');
  };

  const handleStop = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/interview/stop/${interviewId}`);
    } catch {
      // Fall through so the user can still leave the interview screen.
    } finally {
      try {
        window.speechSynthesis?.cancel();
        socketRef.current?.disconnect();
      } catch {}

      navigate('/history');
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header} className="glass-panel">
        <div style={styles.status}>
          <div style={styles.dot}></div>
          <span>Live</span>
        </div>
        <div style={styles.actions}>
          <button style={styles.btnSmall} onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button style={styles.endBtn} onClick={handleStop}>Finish</button>
        </div>
      </header>

      <main style={styles.content}>
        <div style={styles.visualizer} className="glass-panel">
          <div style={{...styles.avatar, borderColor: isAISpeaking ? 'var(--primary)' : 'transparent'}}>
            AI
          </div>
          <h2 style={styles.aiName}>Interviewer</h2>
          <p style={styles.statusLabel}>{isAISpeaking ? 'Speaking' : 'Listening'}</p>
        </div>

        <div style={styles.chat} className="glass-panel">
          <div style={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                ...styles.bubble, 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-solid)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)'
              }}>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.controls}>
            <div style={styles.inputToggle}>
              <button style={styles.modeBtn} onClick={() => setInputMode('voice')}>🎙️</button>
              <button style={styles.modeBtn} onClick={() => setInputMode('text')}>⌨️</button>
            </div>

            {inputMode === 'voice' ? (
              <button 
                style={{...styles.micBtn, background: isRecording ? 'var(--danger)' : 'var(--primary)'}} 
                onClick={startRecording}
              >
                {isRecording ? 'Listening...' : 'Push to Talk'}
              </button>
            ) : (
              <div style={styles.inputRow}>
                <input 
                  style={styles.input} 
                  value={textInput} 
                  onChange={e => setTextInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && sendText()}
                  placeholder="Message..."
                />
                <button style={styles.sendBtn} onClick={sendText}>Send</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', background: '#f8fafc' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' },
  status: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' },
  actions: { display: 'flex', gap: '10px' },
  btnSmall: { background: '#f1f5f9', border: 'none', padding: '8px 12px', borderRadius: '8px' },
  endBtn: { background: '#fef2f2', color: '#ef4444', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600' },
  content: { display: 'flex', gap: '16px', flex: 1, overflow: 'hidden' },
  visualizer: { width: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  avatar: { width: '100px', height: '100px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', border: '4px solid transparent', transition: '0.3s' },
  aiName: { marginTop: '16px', fontSize: '20px' },
  statusLabel: { fontSize: '14px', color: '#64748b' },
  chat: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  messages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  bubble: { maxWidth: '75%', padding: '12px 16px', borderRadius: '12px', fontSize: '15px' },
  controls: { padding: '20px', borderTop: '1px solid #e2e8f0' },
  inputToggle: { display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '16px' },
  modeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  micBtn: { width: '100%', maxWidth: '240px', margin: '0 auto', display: 'block', padding: '14px', borderRadius: '24px', color: '#fff', border: 'none', fontWeight: '600' },
  inputRow: { display: 'flex', gap: '10px' },
  input: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  sendBtn: { background: '#6366f1', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: '600' }
};

export default Interview;