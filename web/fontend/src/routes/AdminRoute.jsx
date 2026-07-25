import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/signin" replace />;
  }


  if (user.role && user.role.toLowerCase() === 'admin') {

    return <Outlet />;
  } else {

    return <Navigate to="/access-denied" replace />;
  }
};

export default AdminRoute;