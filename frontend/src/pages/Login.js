import React, { useState, useEffect } from 'react';
import './Login.css';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.js';

function Login() {
  const { login, register, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [needsRegister, setNeedsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [apiError, setApiError] = useState(null);
  const [isManualRegister, setIsManualRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    const res = await login(username.trim(), password);
    if (!res.success) {
      setError(res.error || 'Login failed');
    }
  };

  const handleRegister = async () => {
    setError(null);
    
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const res = await register(username.trim(), email.trim(), password);
    if (!res.success) {
      setError(res.error || 'Registration failed');
    } else {
      // Registration successful, user will be automatically logged in
      setNeedsRegister(false);
      setIsManualRegister(false);
    }
  };

  const checkUserExists = async () => {
    try {
      const res = await axios.get('/api/exists-users');
      setNeedsRegister(!res.data.exists);
      setApiError(null);
      return res.data.exists;
    } catch (e) {
      setApiError('Unable to contact backend API. Please ensure backend is running.');
      setNeedsRegister(false);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) {
        await checkUserExists();
      }
    })();
    return () => { mounted = false };
  }, []);

  const showRegisterForm = needsRegister || isManualRegister;

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>{showRegisterForm ? 'Create Account' : 'Sign In'}</h2>
        
        {error && <div className="login-error">{error}</div>}
        {apiError && (
          <div className="login-error">
            {apiError} 
            <button 
              type="button" 
              onClick={checkUserExists}
              style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '12px' }}
            >
              Retry
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input 
            type="text"
            value={username} 
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username"
            required
          />

          {showRegisterForm && (
            <>
              <label>Email (optional)</label>
              <input 
                type="email"
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </>
          )}

          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />

          {showRegisterForm && (
            <>
              <label>Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
              />
            </>
          )}

          {!showRegisterForm && (
            <button type="submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          )}

          {showRegisterForm && (
            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          )}
        </form>

        <div style={{marginTop: 16, textAlign: 'center'}}>
          {!showRegisterForm ? (
            <button 
              type="button" 
              className="link-button" 
              onClick={() => setIsManualRegister(true)}
            >
              Need an account? Register
            </button>
          ) : (
            <button 
              type="button" 
              className="link-button" 
              onClick={() => {
                setIsManualRegister(false);
                setError(null);
                setConfirmPassword('');
              }}
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
