// PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import cookies from "js-cookie";

const PrivateRoute = ({ children }) => {
  // Check multiple authentication methods:
  // 1. Redux state (user object)
  // 2. User in localStorage (for persistence after reload)
  // 3. Token in localStorage
  // 4. Cookie-based auth
  const user = useSelector((state) => state.auth?.user);
  const userFromStorage = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  const cookieToken = cookies.get("logged");

  // Allow access if any authentication method is present
  const isAuthenticated = user || userFromStorage || token || cookieToken;

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  return children;
};

export default PrivateRoute;
