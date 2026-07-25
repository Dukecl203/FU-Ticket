// In store/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  preloadedState: {
    auth: authReducer(undefined, { type: 'INIT' }),
  },
});

// This will save the auth state to localStorage whenever it changes
store.subscribe(() => {
  const { auth } = store.getState();
  localStorage.setItem('authState', JSON.stringify(auth));
});

export default store;