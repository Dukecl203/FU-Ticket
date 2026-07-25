import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './AccessDenied.module.scss';
import { StopOutlined } from '@ant-design/icons';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.accessDeniedPage}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <StopOutlined />
        </div>
        <h1 className={styles.title}>Access Denied</h1>
        <p className={styles.description}>
          Rất tiếc, bạn không có quyền truy cập vào trang này. Vui lòng liên hệ với quản trị viên nếu bạn cho rằng đây là một sự nhầm lẫn.
        </p>
        <div className={styles.buttonGroup}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            Quay lại trang trước
          </button>
          <Link to="/" className={styles.homeButton}>
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;