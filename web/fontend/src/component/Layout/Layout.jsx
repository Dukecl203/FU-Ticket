import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../heroComponent/Header';
import Footer from '../heroComponent/Footer';
import { useStore } from '../../hooks/useStore';
import { requestAuth } from '../../config/request';

const Layout = () => {
  const store = useStore();
  const setDataUser = store?.setDataUser;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await requestAuth();
        if (res.data) {
          setDataUser(res.data);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    // Chỉ chạy nếu chưa có dữ liệu người dùng
    if (!store?.dataUser?._id) {
      checkAuth();
    }
  }, [setDataUser, store?.dataUser?._id]);

  return (
    <div className="layout">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
