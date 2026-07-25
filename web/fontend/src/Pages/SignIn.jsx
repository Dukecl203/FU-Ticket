// src/pages/SignIn.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { login, loginWithGoogle } from '../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import '../pages/SignIn.css';
import logo from '../assets/images/logo.png';

const SignIn = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Email and password are required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({
        email: formData.email,
        password: formData.password,
      });

      // Kiểm tra nếu tài khoản bị vô hiệu hóa
      if (
        response.user?.status &&
        response.user.status.toLowerCase() === 'inactive'
      ) {
        toast.error('Your account has been deactivated!');
        navigate('/access-denied');
        return;
      }

      // ✅ Lưu token + user
      dispatch(
        setCredentials({
          user: response.user,
          token: response.accessToken || response.token,
        })
      );

      toast.success('Login successful!');
      
      const role = (response.user?.role || '').toLowerCase();
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      
      if (error.response?.status === 403) {
        toast.error('Your account has been deactivated!');
        navigate('/access-denied');
      } else {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('invalid email or password')) {
          toast.error('Email or password is incorrect');
        } else {
          toast.error(error.message || 'Login failed');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Google Login
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        toast.error('Google credential missing');
        return;
      }
      setIsLoading(true);
      const response = await loginWithGoogle(credential);
      
      console.log('Google login response:', response);
      console.log('User isPasswordSet:', response.user?.isPasswordSet);
      
      dispatch(setCredentials({
        user: response.user,
        token: response.accessToken || response.token
      }));
      toast.success('Login with Google successful!');
      try { setDataUser && setDataUser(response.user); } catch (e) {}
      
      // Check if user needs to set password (first-time Google login)
      if (response.user?.isPasswordSet === false) {
        console.log('Redirecting to setup-password page');
        navigate('/setup-password');
        return;
      }
      
      console.log('User already has password set, redirecting to app');
      
      const roleG = (response.user?.role || '').toLowerCase();
      if (roleG === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Your account has been deactivated!');
        navigate('/access-denied');
      } else {
        toast.error(error.message || 'Google login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google login was cancelled or failed');
  };

  return (
    <div className="auth-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="auth-card"
      >
        <div>
          <h2 className="auth-title">
            <img
              src={logo}
              alt="logo"
              className="logo"
              style={{ width: '100%', height: '100px' }}
            />
          </h2>
          <p className="auth-subtitle">
            Welcome back! Please sign in to your account
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Input */}
            <div className="form-row">
              <label htmlFor="email" className="block">
                Email:
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Password Input */}
            <div className="form-row">
              <label htmlFor="password" className="block">
                Password:
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input-field input-with-icon"
                  placeholder="Your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="eye-btn-abs"
                  aria-label="Toggle password visibility"
                >
                  <FontAwesomeIcon
                    icon={showPassword ? faEyeSlash : faEye}
                    className="h-5 w-5"
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/forgot-password" className="link">
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="actions-center">
            <button
              type="submit"
              disabled={isLoading}
              className={`submit-button ${isLoading ? 'disabled' : ''}`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                      5.291A7.962 7.962 0 014 12H0c0 
                      3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          <div style={{ margin: '16px 0', textAlign: 'center' }}>
            <span style={{ color: '#999' }}>or</span>
          </div>

          <div
            className="actions-center"
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
            />
          </div>

          <div className="auth-subtitle">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/signup" className="link">
              Sign Up
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SignIn;
