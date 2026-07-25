import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import './SignIn.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await forgotPassword({ email });
      toast.success('Password reset request has been sent. Please check your email.');
      setTimeout(() => {
        navigate('/signin');
      }, 3000);
    } catch (error) {
      toast.error(error.message || 'An error occurred while sending the password reset request.');
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
          <h2 className="auth-title">Forgot Password</h2>
          <p className="auth-subtitle">Enter your email address and we'll send you a reset link</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="email" className="block">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
            />
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
                  Sending...
                </>
              ) : (
                'Send Reset Link'
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

export default ForgotPassword;
export { ForgotPassword };