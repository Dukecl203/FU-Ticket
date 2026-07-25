
import { createSlice } from "@reduxjs/toolkit";

const userFromStorage = localStorage.getItem("user")
  ? JSON.parse(localStorage.getItem("user"))
  : null;

const tokenFromStorage = localStorage.getItem("token")
  ? localStorage.getItem("token")
  : null;

const loadState = () => {
  try {
    const serializedState = localStorage.getItem('authState');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return undefined;
  }
};

const saveState = (state) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('authState', serializedState);
  } catch {
    // Ignore write errors
  }
};

const initialState = {
  user: userFromStorage,
  token: tokenFromStorage,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // ✅ Lưu thông tin vào Redux + localStorage
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;

      // Lưu vào localStorage để giữ đăng nhập sau reload
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
    },

    // ✅ Xóa thông tin khi logout
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
