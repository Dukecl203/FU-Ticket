// UnderConstruction.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './UnderConstruction.module.scss';
import { ToolOutlined } from '@ant-design/icons';

const UnderConstruction = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.underConstructionPage}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <ToolOutlined />
        </div>
        <h1 className={styles.title}>Tính năng đang phát triển</h1>
        <p className={styles.description}>
          Chúng tôi đang nỗ lực hoàn thiện tính năng này. Vui lòng quay lại sau hoặc liên hệ hỗ trợ nếu bạn cần giúp đỡ.
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

export default UnderConstruction;