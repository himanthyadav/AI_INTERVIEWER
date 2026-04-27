import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

function Profile() {
  const navigate = useNavigate();
  const [sessionUser, setSessionUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0 });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    degree: '',
    collegeName: '',
    graduationYear: '',
    phone: '',
    location: '',
    targetRole: '',
    skills: '',
    linkedinUrl: '',
    githubUrl: '',
    bio: ''
  });

  useEffect(() => {
    if (!sessionUser) {
      navigate('/');
      return;
    }

    axios.get(`${API_BASE_URL}/api/user/${sessionUser.id}`)
      .then((res) => {
        const data = res.data;
        setProfile(data);
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          degree: data.degree || '',
          collegeName: data.collegeName || '',
          graduationYear: data.graduationYear || '',
          phone: data.phone || '',
          location: data.location || '',
          targetRole: data.targetRole || '',
          skills: Array.isArray(data.skills) ? data.skills.join(', ') : '',
          linkedinUrl: data.linkedinUrl || '',
          githubUrl: data.githubUrl || '',
          bio: data.bio || ''
        });
      })
      .catch(() => {
        setStatus('Unable to load profile details.');
      });

    axios.get(`${API_BASE_URL}/api/interviews/user/${sessionUser.id}`)
      .then((res) => {
        const interviews = res.data?.interviews || [];
        setStats({
          total: interviews.length,
          completed: interviews.filter((item) => !item.isStart).length,
          inProgress: interviews.filter((item) => item.isStart).length
        });
      })
      .catch(() => {
        setStats({ total: 0, completed: 0, inProgress: 0 });
      });
  }, [navigate, sessionUser]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setSessionUser(null);
    navigate('/');
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!sessionUser?.id) return;

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        skills: formData.skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      };

      const response = await axios.patch(`${API_BASE_URL}/api/user/${sessionUser.id}/profile`, payload);
      const updated = response.data.user;

      setProfile(updated);
      setFormData((prev) => ({
        ...prev,
        skills: Array.isArray(updated.skills) ? updated.skills.join(', ') : prev.skills
      }));

      const updatedSessionUser = {
        ...sessionUser,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email
      };

      localStorage.setItem('user', JSON.stringify(updatedSessionUser));
      setSessionUser(updatedSessionUser);
      setStatus('Profile updated successfully.');
      setIsEditing(false);
    } catch {
      setStatus('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!profile) return;
    setFormData({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      degree: profile.degree || '',
      collegeName: profile.collegeName || '',
      graduationYear: profile.graduationYear || '',
      phone: profile.phone || '',
      location: profile.location || '',
      targetRole: profile.targetRole || '',
      skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : '',
      linkedinUrl: profile.linkedinUrl || '',
      githubUrl: profile.githubUrl || '',
      bio: profile.bio || ''
    });
    setIsEditing(false);
  };

  if (!sessionUser) return null;

  return (
    <div style={styles.container}>
      <div style={styles.topNav}>
        <button style={styles.secondaryBtn} onClick={() => navigate('/dashboard')}>Home</button>
      </div>

      <div style={styles.card} className="glass-panel animate-slide-up">
        <div style={styles.headerRow}>
          <h1 style={styles.title}>My Profile</h1>
          <div style={styles.actions}>
            <button style={styles.secondaryBtn} onClick={() => navigate('/history')}>History</button>
            {!isEditing ? (
              <button style={styles.editBtn} onClick={() => setIsEditing(true)}>Edit Profile</button>
            ) : (
              <>
                <button style={styles.saveBtn} onClick={handleSaveProfile} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                <button style={styles.secondaryBtn} onClick={handleCancelEdit}>Cancel</button>
              </>
            )}
            <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {status && <div style={styles.statusBanner}>{status}</div>}

        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.label}>First Name</span>
            {isEditing ? (
              <input name="firstName" value={formData.firstName} onChange={handleInputChange} style={styles.input} />
            ) : (
              <strong style={styles.value}>{profile?.firstName || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Last Name</span>
            {isEditing ? (
              <input name="lastName" value={formData.lastName} onChange={handleInputChange} style={styles.input} />
            ) : (
              <strong style={styles.value}>{profile?.lastName || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Email</span>
            <strong style={styles.value}>{profile?.email || sessionUser.email || '-'}</strong>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>User ID</span>
            <strong style={styles.value}>{sessionUser.id || '-'}</strong>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Degree</span>
            {isEditing ? (
              <input name="degree" value={formData.degree} onChange={handleInputChange} style={styles.input} placeholder="B.Tech, B.E, B.Sc, etc." />
            ) : (
              <strong style={styles.value}>{profile?.degree || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>College Name</span>
            {isEditing ? (
              <input name="collegeName" value={formData.collegeName} onChange={handleInputChange} style={styles.input} placeholder="Your college or university" />
            ) : (
              <strong style={styles.value}>{profile?.collegeName || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Graduation Year</span>
            {isEditing ? (
              <input name="graduationYear" value={formData.graduationYear} onChange={handleInputChange} style={styles.input} placeholder="2027" />
            ) : (
              <strong style={styles.value}>{profile?.graduationYear || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Phone</span>
            {isEditing ? (
              <input name="phone" value={formData.phone} onChange={handleInputChange} style={styles.input} placeholder="+91 9876543210" />
            ) : (
              <strong style={styles.value}>{profile?.phone || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Location</span>
            {isEditing ? (
              <input name="location" value={formData.location} onChange={handleInputChange} style={styles.input} placeholder="City, State" />
            ) : (
              <strong style={styles.value}>{profile?.location || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Target Role</span>
            {isEditing ? (
              <input name="targetRole" value={formData.targetRole} onChange={handleInputChange} style={styles.input} placeholder="Frontend Developer" />
            ) : (
              <strong style={styles.value}>{profile?.targetRole || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>LinkedIn</span>
            {isEditing ? (
              <input name="linkedinUrl" value={formData.linkedinUrl} onChange={handleInputChange} style={styles.input} placeholder="https://linkedin.com/in/yourname" />
            ) : (
              <strong style={styles.value}>{profile?.linkedinUrl || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>GitHub</span>
            {isEditing ? (
              <input name="githubUrl" value={formData.githubUrl} onChange={handleInputChange} style={styles.input} placeholder="https://github.com/yourname" />
            ) : (
              <strong style={styles.value}>{profile?.githubUrl || '-'}</strong>
            )}
          </div>
          <div style={styles.infoItemWide}>
            <span style={styles.label}>Skills (comma separated)</span>
            {isEditing ? (
              <input name="skills" value={formData.skills} onChange={handleInputChange} style={styles.input} placeholder="React, JavaScript, Node.js" />
            ) : (
              <strong style={styles.value}>{Array.isArray(profile?.skills) && profile.skills.length ? profile.skills.join(', ') : '-'}</strong>
            )}
          </div>
          <div style={styles.infoItemWide}>
            <span style={styles.label}>Bio</span>
            {isEditing ? (
              <textarea name="bio" value={formData.bio} onChange={handleInputChange} style={styles.textArea} placeholder="Tell us about your goals and strengths." />
            ) : (
              <strong style={styles.value}>{profile?.bio || '-'}</strong>
            )}
          </div>
        </div>

        <h2 style={styles.sectionTitle}>Interview Stats</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.completed}</div>
            <div style={styles.statLabel}>Completed</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.inProgress}</div>
            <div style={styles.statLabel}>In Progress</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  topNav: { width: '100%', maxWidth: '980px', display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' },
  card: { width: '100%', maxWidth: '980px', padding: '28px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '22px' },
  title: { margin: 0, color: 'var(--text-primary)', fontWeight: '800', fontSize: '26px' },
  actions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  statusBanner: { borderTop: '2px solid rgba(255,255,255,0.98)', borderLeft: '2px solid rgba(255,255,255,0.9)', borderBottom: '2px solid rgba(91,93,246,0.24)', borderRight: '2px solid rgba(124,58,237,0.18)', background: 'rgba(91,93,246,0.08)', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '14px', boxShadow: '3px 3px 0 rgba(91,93,246,0.10)' },
  secondaryBtn: { borderTop: '2px solid rgba(255,255,255,0.98)', borderLeft: '2px solid rgba(255,255,255,0.9)', borderBottom: '2px solid rgba(91,93,246,0.24)', borderRight: '2px solid rgba(124,58,237,0.18)', background: '#fff', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px 14px', fontWeight: '600', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(91,93,246,0.10)' },
  editBtn: { borderTop: '2px solid rgba(255,255,255,0.98)', borderLeft: '2px solid rgba(255,255,255,0.9)', borderBottom: '2px solid rgba(91,93,246,0.24)', borderRight: '2px solid rgba(124,58,237,0.18)', background: 'rgba(91,93,246,0.10)', color: 'var(--primary)', borderRadius: '8px', padding: '10px 14px', fontWeight: '600', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(91,93,246,0.12)' },
  saveBtn: { borderTop: '2px solid rgba(255,255,255,0.98)', borderLeft: '2px solid rgba(255,255,255,0.9)', borderBottom: '2px solid rgba(16,185,129,0.35)', borderRight: '2px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.10)', color: 'var(--success)', borderRadius: '8px', padding: '10px 14px', fontWeight: '600', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(16,185,129,0.12)' },
  logoutBtn: { borderTop: '2px solid rgba(255,255,255,0.98)', borderLeft: '2px solid rgba(255,255,255,0.9)', borderBottom: '2px solid rgba(239,68,68,0.30)', borderRight: '2px solid rgba(239,68,68,0.22)', background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', borderRadius: '8px', padding: '10px 14px', fontWeight: '600', cursor: 'pointer', boxShadow: '3px 3px 0 rgba(239,68,68,0.12)' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' },
  infoItem: { borderTop: '2px solid rgba(255,255,255,0.98)', borderLeft: '2px solid rgba(255,255,255,0.9)', borderBottom: '2px solid rgba(91,93,246,0.22)', borderRight: '2px solid rgba(124,58,237,0.16)', borderRadius: '10px', background: '#fff', padding: '14px', boxShadow: '3px 3px 0 rgba(91,93,246,0.08)' },
  infoItemWide: { borderTop: '2px solid rgba(255,255,255,0.98)', borderLeft: '2px solid rgba(255,255,255,0.9)', borderBottom: '2px solid rgba(91,93,246,0.22)', borderRight: '2px solid rgba(124,58,237,0.16)', borderRadius: '10px', background: '#fff', padding: '14px', gridColumn: '1 / -1', boxShadow: '3px 3px 0 rgba(91,93,246,0.08)' },
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' },
  value: { color: 'var(--text-primary)', fontSize: '15px', wordBreak: 'break-word', fontWeight: '600' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#fff', color: 'var(--text-primary)' },
  textArea: { width: '100%', minHeight: '84px', padding: '10px 12px', borderRadius: '8px', background: '#fff', color: 'var(--text-primary)', resize: 'vertical' },
  sectionTitle: { margin: '0 0 12px 0', color: 'var(--text-primary)', fontWeight: '800' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' },
  statBox: { borderTop: '2px solid rgba(255,255,255,0.98)', borderLeft: '2px solid rgba(255,255,255,0.9)', borderBottom: '2px solid rgba(91,93,246,0.24)', borderRight: '2px solid rgba(124,58,237,0.18)', borderRadius: '10px', background: '#fff', padding: '16px', textAlign: 'center', boxShadow: '3px 3px 0 rgba(91,93,246,0.10)' },
  statValue: { fontSize: '28px', fontWeight: '800', color: 'var(--primary)' },
  statLabel: { color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }
};

export default Profile;
