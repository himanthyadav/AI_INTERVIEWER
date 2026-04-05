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
  const user = localStorage.getItem('user');
  if (!user) return <Navigate to="/" replace />;
  return children;
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button onClick={toggleTheme} style={styles.themeToggle} className="app-theme-toggle">
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
};

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Router>
        <div style={styles.appWrapper}>
          <ThemeToggle />
          <Suspense fallback={<div style={styles.loaderWrapper}><div style={styles.spinner}></div></div>}>
            <Routes>
              <Route path="/" element={<Login />} />
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
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    padding: '11px 18px',
    borderRadius: '30px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '15px',
    backdropFilter: 'blur(10px)',
    boxShadow: 'var(--glass-shadow)',
    transition: 'all 0.3s ease'
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