// src/pages/PasswordSetup.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { setPassword } from '../services/authService';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import '../pages/SignIn.css';
import logo from '../assets/images/logo.png';

const PasswordSetup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if user is not logged in or password is already set
  React.useEffect(() => {
    if (!user) {
      toast.error('Please login first');
      navigate('/signin');
    } else if (user.isPasswordSet) {
      toast.info('Password already set');
      navigate('/');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await setPassword(user.id, {
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });
      
      // Update user in Redux store
      dispatch(setCredentials({
        user: { ...user, isPasswordSet: true },
        token: localStorage.getItem('token') // Keep existing token
      }));
      
      toast.success('Password set successfully!');
      
      const role = (user?.role || '').toLowerCase();
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'user' || role === 'participant') {
        navigate('/profile');
      } else {
        navigate('/');
      }
      
    } catch (error) {
      toast.error(error.message || 'Failed to set password');
    } finally {
      setIsLoading(false);
    }
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
            <img src={logo} alt="logo" className="logo" style={{ width: '100%', height: '100px' }} />
          </h2>
          <p className="auth-subtitle">Set your password to secure your account</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Password Input */}
            <div className="form-row">
              <label htmlFor="password" className="block">
                New Password:
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="input-field input-with-icon"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="eye-btn-abs"
                  aria-label="Toggle password visibility"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Confirm Password Input */}
            <div className="form-row">
              <label htmlFor="confirmPassword" className="block">
                Confirm Password:
              </label>
              <div className="input-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="input-field input-with-icon"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="eye-btn-abs"
                  aria-label="Toggle confirm password visibility"
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="h-5 w-5" />
                </button>
              </div>
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
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting password...
                </>
              ) : (
                'Set Password'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default PasswordSetup;
