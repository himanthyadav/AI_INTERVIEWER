import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, formData);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="glass-panel animate-slide-up">
        <div style={styles.logoCircle}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
            <path d="M12 12 2.1 7.1"></path>
            <path d="m12 12 9.9 4.9"></path>
          </svg>
        </div>
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.subtitle}>Enter your details to continue</p>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input type="email" name="email" style={styles.input} value={formData.email} onChange={handleChange} required />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input type="password" name="password" style={styles.input} value={formData.password} onChange={handleChange} required />
          </div>
          <button type="submit" style={styles.button}>Sign In</button>
        </form>
        
        <p style={styles.linkText}>
          New here? <Link to="/signup" style={styles.link}>Create an account</Link>
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
    maxWidth: '440px',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  logoCircle: {
    width: '64px',
    height: '64px',
    background: 'linear-gradient(135deg, var(--primary), #a855f7)',
    borderRadius: '16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '24px',
    boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)'
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
  inputGroup: {
    marginBottom: '20px',
    width: '100%'
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
    transition: 'background 0.2s',
    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
  },
  linkText: {
    marginTop: '24px',
    color: 'var(--text-secondary)',
    fontSize: '14px'
  },
  link: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: '600'
  },
  errorBanner: {
    width: '100%',
    padding: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--danger)',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid rgba(239, 68, 68, 0.2)'
  }
};

export default Login;