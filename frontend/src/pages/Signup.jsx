import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/signup`, formData);
      setStatus({ type: 'success', message: 'Account created! Redirecting...' });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Registration failed' });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="glass-panel animate-slide-up">
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Start your interview preparation journey</p>

        {status.message && (
          <div style={{...styles.banner, color: status.type === 'error' ? 'var(--danger)' : 'var(--success)', background: status.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>First Name</label>
              <input type="text" name="firstName" style={styles.input} value={formData.firstName} onChange={handleChange} required />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Last Name</label>
              <input type="text" name="lastName" style={styles.input} value={formData.lastName} onChange={handleChange} required />
            </div>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input type="email" name="email" style={styles.input} value={formData.email} onChange={handleChange} required />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input type="password" name="password" style={styles.input} value={formData.password} onChange={handleChange} required />
          </div>
          <button type="submit" style={styles.button}>Sign Up</button>
        </form>
        
        <p style={styles.linkText}>
          Already registered? <Link to="/" style={styles.link}>Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    color: 'var(--text-primary)'
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    marginBottom: '32px'
  },
  form: {
    width: '100%'
  },
  row: {
    display: 'flex',
    gap: '16px'
  },
  inputGroup: {
    marginBottom: '20px',
    flex: 1
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)'
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    fontSize: '15px',
    transition: 'all 0.2s',
  },
  button: {
    width: '100%',
    padding: '16px',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
  },
  linkText: {
    marginTop: '24px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    textAlign: 'center'
  },
  link: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: '600'
  },
  banner: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center',
    fontWeight: '500'
  }
};

export default Signup;