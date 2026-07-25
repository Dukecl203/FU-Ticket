import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { register } from '../services/authService';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import './SignIn.css';
import logo from '../assets/images/logo.png';

const SignUp = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    username: '',
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        full_name: formData.fullname,
        // Optional fields if needed by backend schema
        // phone_number: '',
        // role: 'User',
      });
      toast.success('Registration successful!');
      navigate('/signin'); // Redirect to sign in page after successful registration
    } catch (error) {
      toast.error(error.message || 'Registration failed');
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
          <h2 className="auth-subtitle">Create new Account</h2>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username */}
            <div className="form-row">
              <label htmlFor="username" className="block">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="input-field"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            
            {/* Fullname */}
            <div className="form-row">
              <label htmlFor="fullname" className="block">
                Full Name
              </label>
              <input
                id="fullname"
                name="fullname"
                type="text"
                required
                className="input-field"
                placeholder="Your full name"
                value={formData.fullname}
                onChange={handleChange}
              />
            </div>
            
            {/* Email */}
            <div className="form-row">
              <label htmlFor="email" className="block">
                Email
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
            
            {/* Password */}
            <div className="form-row">
              <label htmlFor="password" className="block">
                Password
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="input-field input-with-icon"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="eye-btn-abs"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Confirm Password */}
            <div className="form-row">
              <label htmlFor="confirmPassword" className="block">
                Confirm Password
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
              <span className="flex items-center">
                {isLoading && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{isLoading ? 'Creating account...' : 'Sign Up'}</span>
              </span>
            </button>
          </div>

          <div className="auth-subtitle" style={{ marginTop: '1rem' }}>
            <span>Already have an account? </span>
            <Link to="/signin" className="link">
              Sign In
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SignUp;