import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserIcon, Bell } from "lucide-react";
import AIRecommend from "../../../../component/Common/aiRecommend/AIRecommend";
import { useStore } from "../../../../hooks/useStore";
import { requestLogout } from "../../../../config/request";
import NotificationSidebar from "../../../../component/Common/Notification/NotificationSidebar";

const AdminHeader = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "demo-1",
      title: "Welcome",
      body: "Thanks for joining FuEvent",
      time: "Just now",
      read: false,
    },
    {
      id: "demo-2",
      title: "New event",
      body: "A new event was posted in your area",
      time: "2h",
      read: false,
    },
  ]);

  const store = useStore();
  const user = store?.dataUser || {};
  const setDataUser = store?.setDataUser;
  const userId = user?._id || user?.id || null;
  const usernameDisplay =
    user?.username ||
    user?.user_name ||
    user?.userName ||
    user?.full_name ||
    "Profile";

  const navigate = useNavigate();
  const profileRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser && !userId) {
      try {
        setDataUser(JSON.parse(savedUser));
      } catch {}
    }
  }, [userId, setDataUser]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logout
  const handleLogout = async () => {
    const ok = window.confirm("Are you sure you want to logout?");
    if (!ok) return;

    try {
      await requestLogout();
    } catch (e) {
      console.error("Logout API error:", e);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    try {
      setDataUser({});
    } catch (e) {}

    navigate("/signin");
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          {/* --- Logo + Menu desktop --- */}
          <div className="header-left">
            <Link to="/" className="logo">
              FuEvent
            </Link>
          </div>

          {/* --- Actions desktop --- */}
          <div className="header-actions">
            {/* 🔔 Notifications */}
            <button
              className="icon-btn"
              onClick={() => setShowNotifications(true)}
              title="Notifications"
            >
              <Bell size={18} />
            </button>

            {/* 👤 Profile or Login */}
            {userId ? (
              <div className="profile-root" ref={profileRef}>
                <button
                  className="login-btn"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <UserIcon size={18} className="icon" /> {usernameDisplay}
                </button>

                {showProfileMenu && (
                  <div className="profile-menu shadow">
                    <Link
                      to="/profile"
                      className="profile-menu-item"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      Hồ sơ
                    </Link>

                    {user?.role === "Admin" && (
                      <Link
                        to="/"
                        className="profile-menu-item"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Trang chủ
                      </Link>
                    )}
                    
                    <Link
                      to="/profile/tickets"
                      className="profile-menu-item"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      Vé của tôi
                    </Link>

                    <button
                      className="profile-menu-item logout-btn"
                      onClick={handleLogout}
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/signin" className="login-btn">
                <UserIcon size={18} className="icon" /> Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* --- Sidebar thông báo --- */}
      <NotificationSidebar
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAllRead={() =>
          setNotifications((s) => s.map((n) => ({ ...n, read: true })))
        }
        onClear={() => setNotifications([])}
      />
    </>
  );
};

export default AdminHeader;
