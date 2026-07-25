import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserIcon, MenuIcon, XIcon, Bell } from "lucide-react";
import axios from "axios";
import "./Header.css";
import AIRecommend from "../Common/aiRecommend/AIRecommend";
import { useStore } from "../../hooks/useStore";
import { requestLogout } from "../../config/request";
import NotificationSidebar from "../Common/Notification/NotificationSidebar";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("app.notifications");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
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
    ];
  });

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

  // 🔔 Fetch notifications from backend when user is logged in
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get(
          "http://localhost:9999/api/notifications",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success && response.data.items && response.data.items.length > 0) {
          // Convert backend notifications to frontend format
          const formattedNotifications = response.data.items.map((n) => ({
            id: n._id,
            _id: n._id,
            title: n.title || "Thông báo",
            body: n.body || n.message || "",
            message: n.message,
            time: n.created_at ? new Date(n.created_at).toLocaleString("vi-VN") : "Just now",
            read: n.read || n.status === "READ",
            type: n.type,
            href: n.href,
          }));

          setNotifications((prev) => {
            // Merge backend notifications with existing ones, avoiding duplicates
            const existingIds = new Set(prev.map((n) => n.id));
            const newNotifications = formattedNotifications.filter(
              (n) => !existingIds.has(n.id)
            );
            return [...newNotifications, ...prev].slice(0, 50);
          });
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    // Fetch on mount and every 30 seconds
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for global notifications dispatched via window events
  useEffect(() => {
    const onNotify = (e) => {
      const { title, body, time, href, openSidebar } = e.detail || {};
      setNotifications((prev) => {
        const next = [
          {
            id: `n_${Date.now()}`,
            title: title || "Notification",
            body: body || "",
            time: time || "Just now",
            read: false,
            href: href || undefined,
          },
          ...prev,
        ];
        return next.slice(0, 50); // cap at 50
      });
      if (openSidebar) setShowNotifications(true);
    };
    window.addEventListener("app:notify", onNotify);
    return () => window.removeEventListener("app:notify", onNotify);
  }, []);

  // Persist notifications whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("app.notifications", JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

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
            <nav className="menu-desktop">
              <Link to="/">Trang chủ</Link>
              <Link to="/events">Các sự kiện</Link>
              <Link to="/about">Về chúng tôi</Link>
              <Link to="/contact">Liên hệ</Link>
            </nav>
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
                        to="/admin/dashboard"
                        className="profile-menu-item"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Quản trị hệ thống
                      </Link>
                    )}
                   {user?.role === "Organizer" && ( <Link
                      to="/organizer"
                      className="profile-menu-item"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      Tạo sự kiện
                    </Link>)}
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

          {/* --- Toggle button mobile --- */}
          <div className="menu-toggle">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>

        {/* --- Menu mobile --- */}
        {isMenuOpen && (
          <nav className="menu-mobile">
            <Link to="/" onClick={() => setIsMenuOpen(false)}>
              Trang chủ
            </Link>
            <Link to="/events" onClick={() => setIsMenuOpen(false)}>
              Các sự kiện
            </Link>
            <Link to="/about" onClick={() => setIsMenuOpen(false)}>
              Về chúng tôi
            </Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)}>
              Liên hệ
            </Link>

            {user?.role === "Admin" && (
              <Link to="/admin/dashboard" onClick={() => setIsMenuOpen(false)}>
                Quản trị hệ thống
              </Link>
            )}

            <div className="menu-mobile-bottom">
              <Link to="/profile/tickets" className="icon-btn">
                Vé của tôi
              </Link>
              {userId ? (
                <Link
                  to="/profile"
                  className="login-btn"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <UserIcon size={18} className="icon" /> {usernameDisplay}
                </Link>
              ) : (
                <Link to="/signin" className="login-btn">
                  <UserIcon size={18} className="icon" /> Login
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* --- Sidebar thông báo --- */}
      <NotificationSidebar
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAllRead={async () => {
          try {
            const token = localStorage.getItem("token");
            if (token) {
              await axios.post(
                "http://localhost:9999/api/notifications/read-all",
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
            }
            setNotifications((s) => s.map((n) => ({ ...n, read: true })));
          } catch (error) {
            console.error("Error marking all as read:", error);
          }
        }}
        onClear={async () => {
          try {
            const token = localStorage.getItem("token");
            if (token) {
              await axios.delete(
                "http://localhost:9999/api/notifications",
                { headers: { Authorization: `Bearer ${token}` } }
              );
            }
            setNotifications([]);
          } catch (error) {
            console.error("Error clearing notifications:", error);
          }
        }}
        onMarkRead={async (n) => {
          try {
            const token = localStorage.getItem("token");
            if (token && n._id) {
              await axios.patch(
                `http://localhost:9999/api/notifications/${n._id}`,
                { read: true },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            }
            setNotifications((s) =>
              s.map((x) => (x.id === n.id ? { ...x, read: true } : x))
            );
          } catch (error) {
            console.error("Error marking notification as read:", error);
          }
        }}
        onDelete={async (n) => {
          try {
            const token = localStorage.getItem("token");
            if (token && n._id) {
              await axios.delete(
                `http://localhost:9999/api/notifications/${n._id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
            }
            setNotifications((s) => s.filter((x) => x.id !== n.id));
          } catch (error) {
            console.error("Error deleting notification:", error);
          }
        }}
        onItemClick={(n) => {
          if (n?.id) {
            setNotifications((s) => s.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
          }
          if (n?.href) {
            navigate(n.href);
          }
          setShowNotifications(false);
        }}
      />

      {/* --- Floating AI recommend bubble --- */}
      <AIRecommend userId={userId} />
    </>
  );
};

export default Header;
