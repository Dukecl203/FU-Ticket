import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import './SignIn.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token');
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('All fields are required');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await resetPassword({
        token,
        newPassword: formData.newPassword
      });
      
      toast.success('Password reset successfully! You can now sign in with your new password.');
      navigate('/signin');
      
    } catch (error) {
      toast.error(error.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="auth-card"
        >
          <div>
            <h2 className="auth-title">Invalid Reset Link</h2>
            <p className="auth-subtitle">This password reset link is invalid or has expired.</p>
          </div>
          
          <div className="actions-center">
            <Link to="/forgot-password" className="submit-button">
              Request New Reset Link
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="auth-card"
      >
        <div>
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">Enter your new password below</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* New Password Input */}
            <div className="form-row">
              <label htmlFor="newPassword" className="block">
                New Password:
              </label>
              <div className="input-wrapper">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="input-field input-with-icon"
                  placeholder="Enter new password"
                  value={formData.newPassword}
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
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="eye-btn-abs"
                  aria-label="Toggle password visibility"
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
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
        </form>
        
        <div className="auth-subtitle" style={{ marginTop: '1rem' }}>
          <Link to="/signin" className="link">
            Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
