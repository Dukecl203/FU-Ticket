import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Typography,
  Input,
  Select,
  Card,
  Row,
  Col,
  Space,
  Spin,
  message,
  Button,
  Pagination,
  Skeleton,
  Popconfirm,
} from "antd";
import {
  UserAddOutlined,
  GiftOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import axios from "axios";
import emailjs from "emailjs-com";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import CollaboratorModal from "./CollaboratorModal";
import DiscountModal from "./DiscountModal";
import useDebounce from "../hooks/useDebounce";
import { io } from "socket.io-client";

// Enable UTC plugin for dayjs
dayjs.extend(utc);
const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const sortOptions = [
  { value: "start_time", label: "Ngày" },
  { value: "title", label: "Tên sự kiện" },
  { value: "location", label: "Địa điểm" },
];

const statusTabs = [
  { key: "completed", label: "Đã kết thúc" },
  { key: "ongoing", label: "Đang diễn ra" },
  { key: "closed", label: "Đã hủy" },
  { key: "approved", label: "Sắp tới" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "draft", label: "Chưa công khai" },
];

const viewTabs = [
  { key: "myEvents", label: "Sự kiện của tôi" },
  { key: "collaborations", label: "Sự kiện cộng tác" },
];

const MyEventsView = ({ onCreate, onEdit, forceCollaborationView = false }) => {
  // Get user from Redux auth state
  const user = useSelector((state) => state.auth.user);
  const USER_ID = user?._id || user?.id;
  const authToken = useSelector((state) => state.auth.token);
  const [eventsData, setEventsData] = useState([]);
  const [collaborationEvents, setCollaborationEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collaborationLoading, setCollaborationLoading] = useState(true);
  const [hasFetchedCategories, setHasFetchedCategories] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 300); // Debounce search by 300ms
  const [sortBy, setSortBy] = useState("start_time");
  const [activeStatus, setActiveStatus] = useState("approved"); // Default to "approved" (Sắp tới)
  const [activeView, setActiveView] = useState(
    forceCollaborationView ? "collaborations" : "myEvents"
  ); // "myEvents" or "collaborations"
  const [collaboratorModalVisible, setCollaboratorModalVisible] =
    useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [collabCurrentPage, setCollabCurrentPage] = useState(1); // Separate page for collaborations
  const [pageSize] = useState(8); // Show 8 events per page
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalCollaborations, setTotalCollaborations] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Force refresh trigger

  // Fetch categories once (they don't change often) - with caching
  useEffect(() => {
    if (!USER_ID || hasFetchedCategories) return;

    const abortController = new AbortController();
    axios
      .get("http://localhost:9999/api/binh/categories", {
        signal: abortController.signal,
      })
      .then((res) => {
        const cats = res.data.data || res.data;
        setCategories(cats);
        setHasFetchedCategories(true);
      })
      .catch((err) => {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
        console.error("Error loading categories:", err);
      });

    return () => abortController.abort();
  }, [USER_ID, hasFetchedCategories]);


  // Force collaboration view for admin/participant - don't fetch own events
  useEffect(() => {
    if (forceCollaborationView) {
      setActiveView("collaborations");
    }
  }, [forceCollaborationView]);

  // Fetch events with server-side pagination and filtering
  useEffect(() => {
    // Skip fetching own events if forced to collaboration view
    if (forceCollaborationView) {
      setLoading(false);
      return;
    }

    if (!USER_ID) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();

    // Map "closed" to "completed" for backward compatibility
    const statusParam = activeStatus === "closed" ? "completed" : activeStatus;

    setLoading(true);

    // Fetch from server
    axios
      .get(
        `http://localhost:9999/api/events/user/${USER_ID}?page=${currentPage}&limit=${pageSize}&status=${statusParam}`,
        { signal: abortController.signal }
      )
      .then((res) => {
        const events = res.data.data || [];
        const pagination = res.data.pagination || {};
        setEventsData(events);
        setTotalEvents(pagination.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
        console.error("Error loading events:", err);
        message.error("Không thể tải dữ liệu sự kiện!");
        setLoading(false);
      });

    return () => abortController.abort();
  }, [USER_ID, currentPage, pageSize, activeStatus, refreshTrigger]);

  // Listen to event status changes via socket
  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:9999";

    const socket = io(socketUrl, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("✅ Connected to socket for event updates");
    });

    // Listen for event status changes
    socket.on("event_status_changed", (data) => {
      console.log("📢 Event status changed:", data);

      // Map "closed" to "completed" for status comparison
      const statusParam =
        activeStatus === "closed" ? "completed" : activeStatus;

      // Update the event in the list if it exists
      setEventsData((prev) => {
        const updated = prev.map((event) => {
          if (event._id === data.eventId || event.id === data.eventId) {
            return {
              ...event,
              status: data.newStatus,
            };
          }
          return event;
        });

        // If the event status changed and no longer matches current filter, remove it
        const eventExists = prev.some(
          (e) => e._id === data.eventId || e.id === data.eventId
        );

        if (eventExists && data.newStatus !== statusParam) {
          // Event no longer matches current filter, remove it
          return updated.filter(
            (e) => e._id !== data.eventId && e.id !== data.eventId
          );
        }

        return updated;
      });

      // Also update collaboration events
      setCollaborationEvents((prev) =>
        prev.map((event) => {
          if (event._id === data.eventId || event.id === data.eventId) {
            return {
              ...event,
              status: data.newStatus,
            };
          }
          return event;
        })
      );

      // Trigger refresh if status changed to a different category
      if (data.newStatus !== statusParam) {
        // Trigger refresh if we're viewing the tab that the event moved to
        if (data.newStatus === activeStatus) {
          setRefreshTrigger((prev) => prev + 1);
        }
      }

      // Show notification
      message.info({
        content:
          data.message || `Sự kiện "${data.eventTitle}" đã thay đổi trạng thái`,
        duration: 4,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [activeStatus]);

  // Fetch collaboration events with pagination
  useEffect(() => {
    if (!USER_ID || activeView !== "collaborations") {
      return;
    }

    const abortController = new AbortController();
    setCollaborationLoading(true);

    // Use proper pagination - only load 12 items per page
    axios
      .get(
        `http://localhost:9999/api/collaborators/user/${USER_ID}?page=${collabCurrentPage}&limit=${pageSize}`,
        { signal: abortController.signal }
      )
      .then((res) => {
        const collaborations = res.data.data || [];
        const pagination = res.data.pagination || {};

        // Map collaborations to events
        const events = collaborations.map((collaboration) => ({
          ...collaboration.event_id,
          collaboration: collaboration,
        }));

        setCollaborationEvents(events);
        setTotalCollaborations(pagination.total || 0);
        setCollaborationLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
        console.error("Error loading collaborations:", err);
        message.error("Không thể tải sự kiện cộng tác!");
        setCollaborationLoading(false);
      });

    return () => abortController.abort();
  }, [USER_ID, activeView, collabCurrentPage, pageSize]);

  // Helper to get category name by id - memoized for performance
  const getCategoryName = useCallback(
    (categoryId) => {
      // If categoryId is already an object with name property, use it directly
      if (
        typeof categoryId === "object" &&
        categoryId !== null &&
        categoryId.name
      ) {
        return categoryId.name;
      }
      // Otherwise, look it up in the categories array
      const cat = categories.find((c) => c._id === categoryId);
      return cat ? cat.name : "Không rõ";
    },
    [categories]
  );

  // Client-side search filter only (for instant feedback)
  const filteredEvents = useMemo(() => {
    if (!debouncedSearchValue) return eventsData;

    return eventsData.filter((event) =>
      event.title?.toLowerCase().includes(debouncedSearchValue.toLowerCase())
    );
  }, [eventsData, debouncedSearchValue]);

  // Reset to page 1 when changing status or search
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, debouncedSearchValue]);

  // Reset collaboration page when switching views
  useEffect(() => {
    if (activeView === "collaborations") {
      setCollabCurrentPage(1);
    }
  }, [activeView]);

  // Send email notifications to admin users
  const sendEmailNotifications = async (adminEmails, eventData) => {
    try {
      console.log("📧 Sending email notifications to admins:", adminEmails);

      // Use the existing EmailJS template
      const EMAILJS_CONFIG = {
        serviceId: "service_vzz4ba6",
        templateId: "template_9he2vdi", // Use existing template
        publicKey: "N0sX7Ju3vZUPP9iX2",
      };

      // Send email to each admin
      const emailPromises = adminEmails.map(async (admin) => {
        try {
          const templateParams = {
            to_email: admin.email,
            to_name: admin.name,
            event_title: eventData.eventTitle,
            event_id: eventData.eventId,
            organizer_name:
              eventData.organizerName ||
              eventData.organizer?.name ||
              "Người tổ chức",
            request_time: eventData.requestTime,
            admin_link: "http://localhost:3000/admin/events",
          };

          const result = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams,
            EMAILJS_CONFIG.publicKey
          );

          console.log(`✅ Email sent successfully to ${admin.email}:`, result);
          return { success: true, email: admin.email };
        } catch (error) {
          console.error(`❌ Failed to send email to ${admin.email}:`, error);
          return { success: false, email: admin.email, error: error.message };
        }
      });

      // Wait for all emails to be sent
      const results = await Promise.allSettled(emailPromises);

      const successCount = results.filter(
        (result) => result.status === "fulfilled" && result.value.success
      ).length;

      console.log(
        `📧 Email sending results: ${successCount}/${adminEmails.length} successful`
      );

      if (successCount > 0) {
        message.success(
          `📧 Thông báo đã được gửi đến ${successCount}/${adminEmails.length} admin!`
        );
      } else {
        message.warning("Không thể gửi email đến admin nào!");
      }
    } catch (error) {
      console.error("Error sending email notifications:", error);
      // Don't show error to user as the main request was successful
    }
  };

  // Handle collaborator modal
  const handleOpenCollaboratorModal = (event) => {
    setSelectedEvent(event);
    setCollaboratorModalVisible(true);
  };

  const handleCloseCollaboratorModal = () => {
    setCollaboratorModalVisible(false);
    setSelectedEvent(null);
  };

  const handleOpenDiscountModal = (event) => {
    setSelectedEvent(event);
    setDiscountModalVisible(true);
  };

  const handleCloseDiscountModal = () => {
    setDiscountModalVisible(false);
    setSelectedEvent(null);
    // Force refetch by incrementing refresh trigger
    if (activeView === "myEvents") {
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  // Force refresh events data by triggering refetch
  const refreshEventsData = useCallback(() => {
    setLoading(true);
    // Force refetch by updating refreshTrigger
    setRefreshTrigger(prev => prev + 1);
  }, []);


  // Request publish handler
  const handleRequestPublish = async (eventId) => {
    try {
      // Use the new dedicated endpoint for publish requests
      const response = await axios.post(
        `http://localhost:9999/api/events/${eventId}/request-publish`
      );

      if (response.data.success) {
        message.success("Yêu cầu đã gửi đến admin!");

        // Update local state
        setEventsData((prev) =>
          prev.map((ev) =>
            ev._id === eventId ? { ...ev, status: "pending" } : ev
          )
        );

        // Force refresh
        setRefreshTrigger((prev) => prev + 1);

        // Send email notifications to admin users via EmailJS
        if (
          response.data.data.adminEmails &&
          response.data.data.adminEmails.length > 0
        ) {
          await sendEmailNotifications(
            response.data.data.adminEmails,
            response.data.data.eventData
          );
        }
      }
    } catch (err) {
      console.error("Error requesting publish:", err);
      message.error("Gửi yêu cầu thất bại!");
    }
  };

  // Handle delete draft event
  const handleDeleteDraftEvent = async (eventId) => {
    try {
      const response = await axios.delete(
        `http://localhost:9999/api/events/${eventId}`
      );

      if (response.data.success) {
        message.success("Đã xóa sự kiện thành công!");

        // Remove from local state
        setEventsData((prev) =>
          prev.filter((ev) => ev._id !== eventId && ev.id !== eventId)
        );
        setTotalEvents((prev) => prev - 1);

        // Force refresh
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      message.error(err.response?.data?.message || "Xóa sự kiện thất bại!");
    }
  };

  // Handle collaboration status update
  const handleUpdateCollaborationStatus = async (eventId, newStatus) => {
    try {
      // Get the authentication token from Redux
      if (!authToken) {
        message.error("Bạn cần đăng nhập để thực hiện hành động này!");
        return;
      }

      console.log("Updating collaboration status:", {
        eventId,
        newStatus,
        token: authToken.substring(0, 20) + "...",
        url: `http://localhost:9999/api/collaborators/events/${eventId}/status`,
      });

      const response = await axios.put(
        `http://localhost:9999/api/collaborators/events/${eventId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        message.success(
          newStatus === "active"
            ? "Đã chấp nhận tham gia sự kiện!"
            : "Đã hủy tham gia sự kiện! Sự kiện sẽ không hiển thị trong danh sách của bạn."
        );

        // Update local state
        setCollaborationEvents((prev) => {
          if (newStatus === "cancelled") {
            // Remove the event from the list when cancelled
            return prev.filter((event) => {
              const eventIdMatch =
                event._id === eventId || event.id === eventId;
              console.log("Filtering event:", {
                eventId: event._id || event.id,
                targetEventId: eventId,
                match: eventIdMatch,
                status: event.collaboration?.status,
              });
              return !eventIdMatch;
            });
          } else {
            // Update the status for other status changes
            return prev.map((event) => {
              const eventIdMatch =
                event._id === eventId || event.id === eventId;
              if (eventIdMatch) {
                return {
                  ...event,
                  collaboration: {
                    ...event.collaboration,
                    status: newStatus,
                  },
                };
              }
              return event;
            });
          }
        });
      }
    } catch (error) {
      console.error("Error updating collaboration status:", error);

      // Show more specific error message
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi cập nhật trạng thái!";
      message.error(errorMessage);

      // Log the full error for debugging
      console.error("Full error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Refresh collaboration events as fallback
      console.log("Refreshing collaboration events as fallback...");
      // Trigger refresh by resetting to page 1 (will cause useEffect to refetch)
      setCollabCurrentPage(1);
    }
  };

  // Show message if user is not logged in
  if (!USER_ID) {
    return (
      <div style={{ width: "100%", textAlign: "center", padding: "50px" }}>
        <Title level={3}>Vui lòng đăng nhập để xem sự kiện của bạn</Title>
        <p>Bạn cần đăng nhập để quản lý và xem các sự kiện của mình.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <Space
        direction="vertical"
        size="large"
        style={{ width: "100%", marginBottom: 24 }}
      >
        {!forceCollaborationView && (
          <Title level={3} style={{ marginBottom: 16 }}>
            <span
              onClick={() => setActiveView("myEvents")}
              style={{
                cursor: "pointer",
                color: activeView === "myEvents" ? "#fa8c16" : "#666",
                fontWeight: activeView === "myEvents" ? "bold" : "normal",
                textDecoration:
                  activeView === "myEvents" ? "underline" : "none",
                transition: "color 0.2s, text-decoration 0.2s",
                marginRight: "20px",
              }}
            >
              Sự kiện của tôi
            </span>
            <span style={{ color: "#ccc", marginRight: "20px" }}>|</span>
            <span
              onClick={() => setActiveView("collaborations")}
              style={{
                cursor: "pointer",
                color: activeView === "collaborations" ? "#fa8c16" : "#666",
                fontWeight: activeView === "collaborations" ? "bold" : "normal",
                textDecoration:
                  activeView === "collaborations" ? "underline" : "none",
                transition: "color 0.2s, text-decoration 0.2s",
              }}
            >
              Sự kiện cộng tác
            </span>
          </Title>
        )}
        {forceCollaborationView && (
          <Title level={3} style={{ marginBottom: 16 }}>
            Sự kiện cộng tác
          </Title>
        )}
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Tìm kiếm sự kiện"
              allowClear
              enterButton="Tìm kiếm"
              size="large"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ maxWidth: 350 }}
            />
          </Col>
          <Col flex="auto">
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveStatus(tab.key)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    background:
                      activeStatus === tab.key ? "#fa8c16" : "#f5f5f5",
                    color: activeStatus === tab.key ? "#fff" : "#444",
                    border: "none",
                    borderRadius: 4,
                    fontWeight: activeStatus === tab.key ? "bold" : "normal",
                    fontSize: "16px",
                    transition: "background 0.2s, color 0.2s",
                    outline: "none",
                    cursor: "pointer",
                    boxShadow:
                      activeStatus === tab.key ? "0 0 0 2px #fa8c16" : "none",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Col>
          <Col>
            <Select
              value={sortBy}
              onChange={setSortBy}
              size="large"
              style={{ minWidth: 150 }}
            >
              {sortOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  Sắp xếp theo {opt.label}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Space>

      {/* My Events Content - Hidden for admin/participant */}
      {!forceCollaborationView && activeView === "myEvents" && (
        <>
          {loading ? (
            <Spin style={{ display: "block", margin: "40px auto" }} />
          ) : (
            <>
              <Row gutter={[24, 24]}>
                {filteredEvents.length === 0 ? (
                  <Col span={24} style={{ textAlign: "center", color: "#888" }}>
                    {debouncedSearchValue
                      ? "Không tìm thấy sự kiện nào phù hợp."
                      : "Không có sự kiện nào."}
                  </Col>
                ) : (
                  filteredEvents.map((event) => (
                    <Col
                      key={event._id || event.id}
                      xs={24}
                      sm={12}
                      md={8}
                      lg={6}
                    >
                      <Card
                        title={event.title}
                        extra={
                          activeStatus === "draft" && (
                            <Popconfirm
                              title="Xóa sự kiện"
                              description="Bạn có chắc muốn xóa sự kiện này?"
                              onConfirm={() =>
                                handleDeleteDraftEvent(event._id || event.id)
                              }
                              okText="Xóa"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                            >
                              <DeleteOutlined
                                style={{
                                  color: "#ff4d4f",
                                  fontSize: "18px",
                                  cursor: "pointer",
                                }}
                              />
                            </Popconfirm>
                          )
                        }
                        variant="outlined"
                        hoverable
                        styles={{
                          header: {
                            color: "#fa8c16",
                            fontWeight: 600,
                            borderBottom: "1px solid #fa8c16",
                            background: "#fff",
                          },
                          body: {
                            color: "#333",
                          },
                        }}
                        style={{
                          border: "1px solid #fa8c16",
                          background: "#fff",
                          color: "#333",
                          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
                          transition: "all 0.2s ease",
                          overflow: "hidden",
                        }}
                        cover={
                          event.poster_url ? (
                            <img
                              alt="poster"
                              src={event.poster_url}
                              loading="lazy"
                              style={{
                                width: "100%",
                                height: "180px",
                                objectFit: "cover",
                                display: "block",
                                borderRadius: "8px 8px 0px 0px",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "180px",
                                background: "#f0f0f0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#aaa",
                                fontSize: 18,
                                borderRadius: "8px 8px 0px 0px",
                              }}
                            >
                              Không có ảnh
                            </div>
                          )
                        }
                      >
                        <p>
                          <b>Ngày bắt đầu:</b>{" "}
                          {dayjs.utc(event.start_time).format("DD/MM/YYYY HH:mm")} (UTC)
                        </p>
                        <p>
                          <b>Ngày kết thúc:</b>{" "}
                          {dayjs.utc(event.end_time).format("DD/MM/YYYY HH:mm")} (UTC)
                        </p>
                        <p>
                          <b>Địa điểm:</b> {event.location}
                        </p>
                        <p>
                          <b>Danh mục:</b> {getCategoryName(event.category_id)}
                        </p>
                        <p>
                          <b>Trạng thái:</b>{" "}
                          {statusTabs.find((tab) => tab.key === event.status)
                            ?.label || event.status}
                        </p>
                        {!forceCollaborationView && (
                          <>
                            <Button
                              type="primary"
                              onClick={() => onEdit(event._id || event.id)}
                              style={{ width: "100%", marginBottom: 8 }}
                            >
                              Chỉnh sửa
                            </Button>
                            <Button
                              icon={<UserAddOutlined />}
                              onClick={() => handleOpenCollaboratorModal(event)}
                              style={{ width: "100%", marginBottom: 8 }}
                            >
                              Quản lý cộng tác viên
                            </Button>
                            <Button
                              icon={<GiftOutlined />}
                              onClick={() => handleOpenDiscountModal(event)}
                              style={{ width: "100%", marginBottom: 8 }}
                            >
                              Quản lý mã giảm giá
                            </Button>
                          </>
                        )}
                        {event.status === "draft" && (
                          <Button
                            type="dashed"
                            onClick={() =>
                              handleRequestPublish(event._id || event.id)
                            }
                            style={{ width: "100%" }}
                          >
                            Yêu cầu công khai
                          </Button>
                        )}
                      </Card>
                    </Col>
                  ))
                )}
              </Row>
              {!debouncedSearchValue && totalEvents > pageSize && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 32,
                  }}
                >
                  <Pagination
                    current={currentPage}
                    total={totalEvents}
                    pageSize={pageSize}
                    onChange={(page) => setCurrentPage(page)}
                    showSizeChanger={false}
                    showTotal={(total) => `Tổng ${total} sự kiện`}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Collaboration Events Content */}
      {activeView === "collaborations" && (
        <>
          {collaborationLoading ? (
            <Spin style={{ display: "block", margin: "40px auto" }} />
          ) : (
            <Row gutter={[24, 24]}>
              {collaborationEvents.length === 0 ? (
                <Col span={24} style={{ textAlign: "center", color: "#888" }}>
                  Bạn chưa tham gia sự kiện nào với vai trò cộng tác viên.
                </Col>
              ) : (
                collaborationEvents
                  .filter(
                    (event) => event.collaboration?.status !== "cancelled"
                  )
                  .map((event) => (
                    <Col
                      key={event._id || event.id}
                      xs={24}
                      sm={12}
                      md={8}
                      lg={6}
                    >
                      <Card
                        title={event.title}
                        variant="outlined"
                        hoverable
                        styles={{
                          header: {
                            color: "#1890ff",
                            fontWeight: 600,
                            fontSize: "16px",
                            padding: "12px 16px",
                            borderBottom: "1px solid #1890ff",
                            background: "#fff",
                          },
                          body: {
                            color: "#333",
                            padding: "16px",
                            fontSize: "14px",
                          },
                        }}
                        style={{
                          border: "1px solid #1890ff",
                          background: "#fff",
                          color: "#333",
                          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
                          transition: "all 0.2s ease",
                          overflow: "hidden",
                        }}
                      >
                        <p>
                          <b>Thời gian:</b>{" "}
                          {dayjs.utc(event.start_time).format("DD/MM/YYYY HH:mm")} (UTC)
                        </p>
                        <p>
                          <b>Địa điểm:</b> {event.location}
                        </p>
                        <p>
                          <b>Danh mục:</b> {getCategoryName(event.category_id)}
                        </p>
                        <p>
                          <b>Trạng thái:</b>{" "}
                          {statusTabs.find((tab) => tab.key === event.status)
                            ?.label || event.status}
                        </p>
                        <p>
                          <b>Vai trò:</b>{" "}
                          <span
                            style={{
                              color: "#1890ff",
                              fontWeight: "bold",
                              textTransform: "capitalize",
                            }}
                          >
                            {event.collaboration?.role?.replace("_", " ") ||
                              "Cộng tác viên"}
                          </span>
                        </p>
                        <p>
                          <b>Trạng thái cộng tác:</b>{" "}
                          <span
                            style={{
                              color:
                                event.collaboration?.status === "active"
                                  ? "#52c41a"
                                  : event.collaboration?.status === "pending"
                                  ? "#faad14"
                                  : "#d9d9d9",
                              fontWeight: "bold",
                            }}
                          >
                            {event.collaboration?.status === "active"
                              ? "Đang hoạt động"
                              : event.collaboration?.status === "pending"
                              ? "Chờ xác nhận"
                              : event.collaboration?.status === "completed"
                              ? "Hoàn thành"
                              : event.collaboration?.status === "cancelled"
                              ? "Đã hủy"
                              : "Không xác định"}
                          </span>
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexDirection: "column",
                          }}
                        >
                          {/* Status Update Buttons */}
                          {event.collaboration?.status === "pending" && (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <Button
                                type="primary"
                                size="small"
                                onClick={() =>
                                  handleUpdateCollaborationStatus(
                                    event._id || event.id,
                                    "active"
                                  )
                                }
                                style={{ flex: 1 }}
                              >
                                Accept
                              </Button>
                              <Button
                                danger
                                size="small"
                                onClick={() =>
                                  handleUpdateCollaborationStatus(
                                    event._id || event.id,
                                    "cancelled"
                                  )
                                }
                                style={{ flex: 1 }}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          {/* Scanning Button - Only show for active collaborations */}
                          {event.collaboration?.status === "active" && (
                            <Button
                              type="primary"
                              icon={<UserAddOutlined />}
                              onClick={() => {
                                // Navigate to ticket scanning page
                                window.open(
                                  `/organizer/events/${
                                    event._id || event.id
                                  }/pending`,
                                  "_blank"
                                );
                              }}
                              style={{ width: "100%" }}
                            >
                              Scanning Ticket
                            </Button>
                          )}
                        </div>
                      </Card>
                    </Col>
                  ))
              )}
            </Row>
          )}
          {totalCollaborations > pageSize && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 32,
              }}
            >
              <Pagination
                current={collabCurrentPage}
                total={totalCollaborations}
                pageSize={pageSize}
                onChange={(page) => setCollabCurrentPage(page)}
                showSizeChanger={false}
                showTotal={(total) => `Tổng ${total} sự kiện cộng tác`}
              />
            </div>
          )}
        </>
      )}

      {/* Collaborator Modal */}
      <CollaboratorModal
        visible={collaboratorModalVisible}
        onClose={handleCloseCollaboratorModal}
        eventId={selectedEvent?._id || selectedEvent?.id}
        eventTitle={selectedEvent?.title}
      />

      {/* Discount Modal */}
      <DiscountModal
        visible={discountModalVisible}
        onClose={handleCloseDiscountModal}
        eventId={selectedEvent?._id || selectedEvent?.id}
        eventTitle={selectedEvent?.title}
      />
    </div>
  );
};

export default MyEventsView;
