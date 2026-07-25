import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Sidebar.css";
import { useStore } from "../../../hooks/useStore.jsx";
function Sidebar() {
  const store = useStore();
  const userd = store?.dataUser || {};
  const userId = userd?.id || null;
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios
      .get(`http://localhost:9999/api/users/${userId}`)
      .then((res) => {
        setUser(res.data.data);
      })
      .catch((err) => console.error("Lỗi tải user:", err));
  }, [userId]);

  return (
    <div className="mt-sidebar">
      <div className="mt-user-profile">
        <img
          src="https://images.pexels.com/photos/1081685/pexels-photo-1081685.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1"
          alt="User avatar"
          className="mt-user-avatar"
        />
        <div className="mt-user-info">
          <div className="mt-user-label">Tài khoản của</div>
          <div className="mt-user-name">
            {user ? user.full_name : "Đang tải..."}
          </div>
        </div>
      </div>

      <nav className="mt-sidebar-nav">
        <a href="/suggestions" className="mt-nav-item">
          <span className="mt-nav-icon">💡</span> {/* icon mới */}
          <span className="mt-nav-text">AI gợi ý sự kiện</span>
        </a>
        <a href="/filterAI" className="mt-nav-item">
          <span className="mt-nav-icon">💡</span> {/* icon mới */}
          <span className="mt-nav-text">Sự kiện của tôi- sở thích của bạn</span>
        </a>
        <a href="#" className="mt-nav-item active">
          <span className="mt-nav-icon">🎫</span>
          <span className="mt-nav-text">Vé của tôi</span>
        </a>
        <a href="/organizer" className="mt-nav-item">
          <span className="mt-nav-icon">📅</span>
          <span className="mt-nav-text">Sự kiện của tôi</span>
        </a>
      </nav>
    </div>
  );
}

export default Sidebar;
