// src/services/authService.js
import axios from 'axios';

const API_URL = '/api';

export const login = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/login`, credentials);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      'Đã xảy ra lỗi khi đăng nhập'
    );
  }
};

export const loginWithGoogle = async (credential) => {
  try {
    const response = await axios.post(`${API_URL}/login-google`, { credential });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
      'Đã xảy ra lỗi khi đăng nhập với Google'
    );
  }
};

export const register = async (userData) => {
  try {
   const response = await axios.post(`${API_URL}/register`, userData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      'Đã xảy ra lỗi khi đăng ký'
    );
  }
};

export const forgotPassword = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/forgot-password`, data);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      'Đã xảy ra lỗi khi yêu cầu khôi phục mật khẩu'
    );
  }
};

export const resetPassword = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/reset-password`, data);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      'Đã xảy ra lỗi khi đặt lại mật khẩu'
    );
  }
};

export const setPassword = async (userId, data) => {
  try {
    const response = await axios.post(`${API_URL}/users/${userId}/set-password`, data);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      'Đã xảy ra lỗi khi đặt mật khẩu'
    );
  }
};
