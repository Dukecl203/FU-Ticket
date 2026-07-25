import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  Layout,
  Menu,
  Button,
  ConfigProvider,
  theme,
  Space,
  Spin,
  Dropdown,
  Avatar,
  Modal,
} from "antd";
import {
  HomeOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { message } from "antd";
import {
  Link,
  useNavigate,
  useLocation,
  Routes,
  Route,
  useParams,
  Navigate,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../store/authSlice";
import OrganizerInfoModal from "../components/OrganizerInfoModal";

// Lazy load components for better performance - only load when needed
const MyEventsView = lazy(() => import("../components/MyEventsView"));
const CreateEventView = lazy(() => import("../components/CreateEventView"));
const ReportManageView = lazy(() => import("../components/ReportManageView"));
const EventReportDetailView = lazy(() =>
  import("../components/EventReportDetailView")
);
const TermsView = lazy(() => import("../components/TermsView"));
const EditEventView = lazy(() => import("../components/EditEventView"));

const { Header, Sider, Content } = Layout;

// Wrapper components to extract route params
const EditEventViewWrapper = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  return (
    <EditEventView eventId={eventId} onBack={() => navigate("/organizer")} />
  );
};

const EventReportDetailViewWrapper = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  return (
    <EventReportDetailView
      eventId={eventId}
      onBack={() => navigate("/organizer/reports")}
    />
  );
};

// Menu items - will be filtered based on role
const allMenuItems = [
  { key: "1", icon: <HomeOutlined />, label: "Sự kiện của tôi" },
  { key: "2", icon: <FileTextOutlined />, label: "Quản lý báo cáo" },
  { key: "3", icon: <InfoCircleOutlined />, label: "Điều khoản" },
];

const OrganizerEventManage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state) => state.auth?.user);

  // If user is not loaded and we're authenticated, try to get from localStorage
  const userFromStorage = React.useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const currentUser = user || userFromStorage;
  
  // Check user role - determine if user is admin or participant
  const userRole = currentUser?.role;
  const isOrganizer = userRole === "Organizer";
  const isAdminOrParticipant = userRole === "Admin" || userRole === "Participant";
  
  const [organizerInfoModalVisible, setOrganizerInfoModalVisible] = useState(false);

  // Determine selected menu based on current route
  const getSelectedMenu = () => {
    const path = location.pathname;
    if (path.includes("/reports")) return "2";
    if (path.includes("/terms")) return "3";
    return "1"; // Default to "Sự kiện của tôi"
  };

  const [selectedMenu, setSelectedMenu] = useState(getSelectedMenu());

  // Update selected menu when route changes
  useEffect(() => {
    setSelectedMenu(getSelectedMenu());
  }, [location.pathname]);

  // Handle URL parameters for Facebook connection success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("facebook_connected") === "true") {
      message.success("Facebook đã được kết nối thành công!");
      // Store in localStorage for persistence
      localStorage.setItem("facebook_connected", "true");
      // Clean up URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete("facebook_connected");
      newUrl.searchParams.delete("mock");
      window.history.replaceState({}, "", newUrl);
    }

    if (urlParams.get("error") === "facebook_connection_failed") {
      message.error("Kết nối Facebook thất bại. Vui lòng thử lại!");
      localStorage.removeItem("facebook_connected");
      // Clean up URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete("error");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  // Handle logout
  const handleLogout = () => {
    dispatch(logout());
    message.success("Đăng xuất thành công!");
    navigate("/signin");
  };

  // Handle create event button click - show modal for admin/participant
  const handleCreateEventClick = () => {
    if (isAdminOrParticipant) {
      setOrganizerInfoModalVisible(true);
    } else {
      navigate("/organizer/create");
    }
  };

  // Filter menu items based on role
  const menuItems = isOrganizer 
    ? allMenuItems 
    : allMenuItems.filter(item => item.key !== "2"); // Hide "Quản lý báo cáo" for admin/participant

  // User menu items
  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Thông tin cá nhân",
      onClick: () => navigate("/profile"),
    },
    {
      key: "organizer",
      icon: <HomeOutlined />,
      label: "Quản lý sự kiện",
      onClick: () => navigate("/organizer"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#fa8c16",
          borderRadius: 10,
        },
      }}
    >
      <Layout style={{ minHeight: "100vh", background: "#f9f9f9" }}>
        <Sider
          width={220}
          style={{
            background: "#fff",
            borderRight: "1px solid #e8e8e8",
          }}
        >
          <Link
            to="/"
            style={{
              color: "#fa8c16",
              padding: "20px",
              fontWeight: "bold",
              fontSize: "20px",
              textAlign: "center",
              borderBottom: "1px solid #f0f0f0",
              textDecoration: "none",
            }}
          >
            FUEvent Organizer
          </Link>
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            items={menuItems}
            style={{ border: "none" }}
            onClick={({ key }) => {
              if (key === "1") {
                navigate("/organizer");
              } else if (key === "2") {
                // Block access to reports for admin/participant
                if (isAdminOrParticipant) {
                  message.warning("Bạn không có quyền truy cập trang này!");
                  return;
                }
                navigate("/organizer/reports");
              } else if (key === "3") {
                navigate("/organizer/terms");
              }
            }}
          />
        </Sider>
        <Layout>
          <Header
            style={{
              background: "#fff",
              borderBottom: "1px solid #e8e8e8",
              padding: "0 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 64,
            }}
          >
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateEventClick}
              >
                Tạo sự kiện
              </Button>
            </Space>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
              trigger={["click"]}
            >
              <Button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "40px",
                  padding: "4px 12px",
                  cursor: "pointer",
                }}
              >
                <Avatar
                  size="small"
                  src={currentUser?.avatar_url || currentUser?.profile_picture}
                  icon={
                    !currentUser?.avatar_url &&
                    !currentUser?.profile_picture && <UserOutlined />
                  }
                  style={{ backgroundColor: "#fa8c16" }}
                />
                <span
                  style={{
                    maxWidth: "150px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUser?.full_name ||
                    currentUser?.fullName ||
                    currentUser?.name ||
                    "User"}
                </span>
              </Button>
            </Dropdown>
          </Header>
          <Content
            style={{
              padding: "32px",
              background: "#f9f9f9",
              display: "flex",
              justifyContent: "center",
              minHeight: "calc(100vh - 64px)",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "4800px",
                background: "#fff",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <Suspense
                fallback={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: "400px",
                    }}
                  >
                    <Spin size="large" tip="Đang tải..." />
                  </div>
                }
              >
                <Routes>
                  <Route
                    index
                    element={
                      <MyEventsView
                        onCreate={handleCreateEventClick}
                        onEdit={(eventId) => {
                          if (isAdminOrParticipant) {
                            message.warning("Bạn không có quyền chỉnh sửa sự kiện!");
                            return;
                          }
                          navigate(`/organizer/edit/${eventId}`);
                        }}
                        forceCollaborationView={isAdminOrParticipant}
                      />
                    }
                  />
                  <Route
                    path="create"
                    element={
                      isAdminOrParticipant ? (
                        <Navigate to="/organizer" replace />
                      ) : (
                        <CreateEventView onBack={() => navigate("/organizer")} />
                      )
                    }
                  />
                  <Route
                    path="edit/:eventId"
                    element={
                      isAdminOrParticipant ? (
                        <Navigate to="/organizer" replace />
                      ) : (
                        <EditEventViewWrapper />
                      )
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      isAdminOrParticipant ? (
                        <Navigate to="/organizer" replace />
                      ) : (
                        <ReportManageView
                          onViewReport={(eid) =>
                            navigate(`/organizer/reports/${eid}`)
                          }
                        />
                      )
                    }
                  />
                  <Route
                    path="reports/:eventId"
                    element={
                      isAdminOrParticipant ? (
                        <Navigate to="/organizer" replace />
                      ) : (
                        <EventReportDetailViewWrapper />
                      )
                    }
                  />
                  <Route path="terms" element={<TermsView />} />
                </Routes>
              </Suspense>
            </div>
          </Content>
        </Layout>
      </Layout>
      
      {/* Organizer Info Modal for Admin/Participant */}
      <OrganizerInfoModal
        visible={organizerInfoModalVisible}
        onClose={() => setOrganizerInfoModalVisible(false)}
      />
    </ConfigProvider>
  );
};

export default OrganizerEventManage;
