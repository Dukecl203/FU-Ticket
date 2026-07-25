import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.scss';
import { FrownOutlined } from '@ant-design/icons';

const NotFound = () => {
  return (
    <div className={styles.notFoundPage}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <FrownOutlined />
        </div>
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.title}>Oops! Page Not Found</h2>
        <p className={styles.description}>
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc đã được di chuyển đến một địa chỉ khác.
        </p>
        <Link to="/" className={styles.homeButton}>
          Quay về trang chủ
        </Link>
      </div>
    </div>
  );
};

export default NotFound;