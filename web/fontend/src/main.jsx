import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter as Router,
  useRoutes,
} from "react-router-dom";
import { Provider } from 'react-redux';
import store from './store/store.js';
import { publicRoutes } from "./routes/index.jsx";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { ToastContainer } from 'react-toastify';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import 'react-toastify/dist/ReactToastify.css';
const AppRoutes = () => {
  return useRoutes(publicRoutes);
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
        <Provider store={store}>
          <Router>
            <AppRoutes />
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
          </Router>
        </Provider>
      </GoogleOAuthProvider>
    </HelmetProvider>
  </StrictMode>
);
