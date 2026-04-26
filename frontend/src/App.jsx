import { useState, useEffect, Suspense, lazy, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Interview = lazy(() => import('./pages/Interview'));
const Report = lazy(() => import('./pages/Report'));
const InterviewHistory = lazy(() => import('./pages/InterviewHistory'));

export const ThemeContext = createContext();

const ProtectedRoute = ({ children }) => {
  return children;
};

const ThemeToggle = () => {
  const { toggleTheme } = useContext(ThemeContext);
  return (
    <button onClick={toggleTheme} style={styles.themeToggle} className="app-theme-toggle">
      ☀️ Light
    </button>
  );
};

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }, []);

  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Router>
        <div style={styles.appWrapper}>
          <ThemeToggle />
          <Suspense fallback={<div style={styles.loaderWrapper}><div style={styles.spinner}></div></div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/interview/:interviewId" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><InterviewHistory /></ProtectedRoute>} />
              <Route path="/report/:interviewId" element={<ProtectedRoute><Report /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ThemeContext.Provider>
  );
}

const styles = {
  appWrapper: {
    position: 'relative',
    minHeight: '100vh',
  },
  themeToggle: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    zIndex: 1000,
    background: '#ffffff',
    color: '#6366f1',
    borderTop:    '2px solid rgba(255,255,255,0.95)',
    borderLeft:   '2px solid rgba(255,255,255,0.85)',
    borderBottom: '2px solid rgba(99,102,241,0.22)',
    borderRight:  '2px solid rgba(99,102,241,0.16)',
    padding: '10px 18px',
    borderRadius: '30px',
    cursor: 'default',
    fontWeight: '700',
    fontSize: '15px',
    boxShadow: '3px 3px 0 rgba(99,102,241,0.12), -2px -2px 0 rgba(255,255,255,0.95), 0 6px 18px rgba(99,102,241,0.10)',
    transition: 'all 0.2s ease'
  },
  loaderWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--border)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

export default App;