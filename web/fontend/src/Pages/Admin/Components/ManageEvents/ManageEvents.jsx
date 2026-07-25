import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeFilled,
  FileExclamationOutlined,
  HourglassOutlined,
  SearchOutlined,
  StopOutlined,
  FilterOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  LockOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Spin,
  Alert,
  Descriptions,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// Enable UTC plugin for dayjs
dayjs.extend(utc);
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Notice from "../../../../component/Common/Notice/index";
import TooltipArrow from "../../../../component/Common/TooltipArrow/index";
import { API_BASE } from "../../../../constants/constants";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE,
  PAGINATION,
} from "../../../../constants/pageSizeOptions";
import styles from "./ManageEvents.module.scss";
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const { RangePicker } = DatePicker;

const ManageEvents = () => {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    current: PAGINATION.currentPage,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingEventId, setUpdatingEventId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, []);

  // Socket listener for real-time event status updates
  useEffect(() => {
    // Chỉ kết nối socket nếu chưa tồn tại
    if (socketRef.current) {
      console.log("🔌 Socket already exists, skipping reconnection");
      return;
    }

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:9999";
    console.log("🔌 Connecting to socket:", socketUrl);

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Admin: Connected to socket for event status updates");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    // Listen for event status changes
    socket.on("event_status_changed", (data) => {
      console.log("📢 Admin: Event status changed received:", data);

      setEvents((prevEvents) => {
        const updatedEvents = prevEvents.map((event) => {
          if (event._id === data.eventId) {
            console.log(
              `🔄 Updating event ${event.title} from ${event.status} to ${data.newStatus}`
            );

            const updatedEvent = {
              ...event,
              status: data.newStatus,
            };

            const displayStatus = getDisplayStatus(updatedEvent);

            return {
              ...updatedEvent,
              display_status: displayStatus,
            };
          }
          return event;
        });

        return updatedEvents;
      });

      Notice({
        msg: "Cập nhật trạng thái sự kiện",
        desc:
          data.message ||
          `Sự kiện "${data.eventTitle}" đã thay đổi trạng thái từ ${data.oldStatus} sang ${data.newStatus}`,
        isSuccess: true,
      });
    });

    // Cleanup - CHỈ khi component unmount thật sự
    return () => {
      console.log("🔌 Component unmounting - disconnecting socket");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Hàm xác định display_status dựa trên status và thời gian (giống backend)
  const getDisplayStatus = (event) => {
    const now = new Date();
    if (event.status === "pending") return "Pending";
    if (event.status === "draft") return "Draft";
    if (event.status === "approved") {
      // For approved events, show more specific status based on time
      if (event.start_time && event.end_time) {
        if (new Date(event.start_time) > now) return "Upcoming";
        if (
          new Date(event.start_time) <= now &&
          new Date(event.end_time) >= now
        )
          return "Ongoing";
        if (new Date(event.end_time) < now) return "Completed";
      }
      return "Approved";
    }
    if (event.status === "ongoing") return "Ongoing";
    if (event.status === "completed") return "Completed";
    if (event.status === "closed") return "Closed";
    return "Unknown";
  };

  // Hàm xác định trạng thái có thể chọn dựa trên trạng thái hiện tại
  const getAvailableStatusOptions = (currentStatus, displayStatus) => {
    const options = [];

    switch (currentStatus) {
      case "pending":
        // Khi ở trạng thái chờ duyệt, chỉ có thể approved hoặc rejected
        options.push(
          { value: "approved", label: "Đồng ý phê duyệt" },
          { value: "rejected", label: "Từ chối" }
        );
        break;

      case "approved":
        // Khi đã approved, chỉ có thể closed (nếu là upcoming)
        if (displayStatus === "Upcoming") {
          options.push({ value: "closed", label: "Đóng sự kiện bắt buộc" });
        }
        break;

      case "draft":
        // Khi là draft, có thể chuyển lên pending để duyệt lại
        options.push({ value: "pending", label: "Chờ phê duyệt" });
        break;

      default:
        // Các trạng thái khác không thể thay đổi
        break;
    }

    return options;
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/events/all-events`);
      if (res.data.success && Array.isArray(res.data.data)) {
        // Áp dụng display_status cho mỗi event
        const eventsWithDisplayStatus = res.data.data.map((event) => ({
          ...event,
          display_status: getDisplayStatus(event),
        }));

        const sorted = [...eventsWithDisplayStatus].sort((a, b) => {
          if (a.created_at && b.created_at) {
            return new Date(b.created_at) - new Date(a.created_at);
          }
          return a._id < b._id ? 1 : -1;
        });
        setEvents(sorted);
      } else {
        Notice({
          msg: "Lỗi",
          desc: "Dữ liệu sự kiện không hợp lệ từ server",
          isSuccess: false,
        });
      }
    } catch (error) {
      Notice({
        msg: "Lỗi",
        desc: error.message,
        isSuccess: false,
      });
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/binh/categories`);
      if (res.data.success && Array.isArray(res.data.data)) {
        setCategories(res.data.data);
      } else {
        console.error("Dữ liệu categories không hợp lệ:", res.data);
        Notice({
          msg: "Lỗi",
          desc: "Dữ liệu danh mục không hợp lệ từ server",
          isSuccess: false,
        });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      Notice({
        msg: "Lỗi",
        desc: "Không thể tải danh sách danh mục",
        isSuccess: false,
      });
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleEdit = (record) => {
    // Kiểm tra xem sự kiện có bị khóa không
    const now = new Date();
    const isLocked =
      record.status === "ongoing" ||
      record.status === "completed" ||
      record.status === "closed" ||
      (record.status === "approved" &&
        record.start_time &&
        new Date(record.start_time) <= now);

    if (isLocked) {
      let statusText = "";
      switch (record.status) {
        case "ongoing":
          statusText = "đang diễn ra";
          break;
        case "completed":
          statusText = "đã kết thúc";
          break;
        case "closed":
          statusText = "đã bị buộc đóng";
          break;
        case "approved":
          statusText = "đã bắt đầu";
          break;
        default:
          statusText = record.status;
      }

      Notice({
        msg: "Không thể chỉnh sửa",
        desc: `Sự kiện này đã bị khóa và không thể chỉnh sửa. Trạng thái: ${statusText}`,
        isSuccess: false,
      });
      return;
    }

    setEditingEvent(record);

    // Lấy các option có sẵn cho trạng thái hiện tại
    const availableOptions = getAvailableStatusOptions(
      record.status,
      record.display_status
    );

    // Tìm option tương ứng với trạng thái hiện tại
    const currentOption = availableOptions.find(
      (opt) => opt.value === record.status
    );

    const formValues = {
      status: currentOption ? currentOption.value : record.status,
    };

    // Nếu là trạng thái rejected hoặc closed, set rejection_reason
    if (record.status === "rejected" || record.status === "closed") {
      formValues.rejection_reason = record.rejection_reason || "";
    }

    form.setFieldsValue(formValues);
    setModalVisible(true);
  };

  const getStatusLabel = (value) => {
    const statusLabels = {
      draft: "Bản nháp",
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      rejected: "Đã từ chối",
      closed: "Đã bị buộc đóng",
      ongoing: "Đang diễn ra",
      completed: "Đã kết thúc",
    };
    return statusLabels[value] || value;
  };

  const handleDelete = async (id) => {
    try {
      // Tìm sự kiện cần xóa để kiểm tra trạng thái
      const eventToDelete = events.find((event) => event._id === id);

      if (!eventToDelete) {
        Notice({
          msg: "Lỗi",
          desc: "Không tìm thấy sự kiện",
          isSuccess: false,
        });
        return;
      }

      // Kiểm tra xem sự kiện có được phép xóa không
      const canDelete = checkIfEventCanBeDeleted(eventToDelete);

      if (!canDelete.allowed) {
        Notice({
          msg: "Không thể xóa",
          desc: canDelete.message,
          isSuccess: false,
        });
        return;
      }

      const res = await axios.delete(`${API_BASE}/events/${id}`);
      if (res.data.success) {
        Notice({
          msg: "Thành công",
          desc: "Xóa sự kiện thành công",
          isSuccess: true,
        });
        fetchEvents();
      } else {
        Notice({
          msg: "Lỗi",
          desc: res.data.message || "Không thể xóa sự kiện",
          isSuccess: false,
        });
      }
    } catch (error) {
      Notice({
        msg: "Lỗi",
        desc: error.message,
        isSuccess: false,
      });
    }
  };

  // Hàm kiểm tra xem sự kiện có thể bị xóa không
  const checkIfEventCanBeDeleted = (event) => {
    // Chỉ cho phép xóa các sự kiện có trạng thái "closed" hoặc "completed"
    const allowedStatuses = ["closed", "completed"];

    if (!allowedStatuses.includes(event.status)) {
      let statusText = "";
      switch (event.status) {
        case "draft":
          statusText = "bản nháp";
          break;
        case "pending":
          statusText = "đang chờ duyệt";
          break;
        case "approved":
          statusText = "đã được phê duyệt";
          break;
        case "ongoing":
          statusText = "đang diễn ra";
          break;
        default:
          statusText = event.status;
      }

      return {
        allowed: false,
        message: `Không thể xóa sự kiện ${statusText}.`,
      };
    }

    // Cho phép xóa các sự kiện completed và closed
    return {
      allowed: true,
      message: "Có thể xóa sự kiện",
    };
  };
  const handleViewDetail = (record) => {
    navigate(`/admin/events/${record._id}`);
  };

  const handleSubmit = async () => {
    // Bắt đầu loading
    setUpdatingStatus(true);
    setUpdatingEventId(editingEvent?._id || null);

    try {
      const values = await form.validateFields();

      // Chỉ gửi các trạng thái và lý do từ chối/hủy
      const payload = {
        status: values.status,
      };

      // Nếu là trạng thái rejected hoặc closed, thêm rejection_reason
      if (values.status === "rejected" || values.status === "closed") {
        if (values.rejection_reason) {
          payload.rejection_reason = values.rejection_reason;
        }
      }

      // Kiểm tra trùng lịch trước khi gửi request
      // Khi admin duyệt sự kiện (status = "approved"), chỉ kiểm tra với sự kiện đã approved
      if (payload.status === "approved") {
        const conflictCheck = await checkEventConflict(
          editingEvent,
          editingEvent?._id
        );
        if (conflictCheck.hasConflict) {
          Notice({
            msg: "Lỗi",
            desc: conflictCheck.message,
            isSuccess: false,
          });
          setUpdatingStatus(false);
          setUpdatingEventId(null);
          return;
        }
      }

      // Hiển thị thông báo đang xử lý
      if (payload.status === "approved") {
        Notice({
          msg: "Đang xử lý...",
          desc: "Đang duyệt sự kiện và gửi thông báo",
          isSuccess: true,
          duration: 0,
        });
      } else if (payload.status === "rejected") {
        Notice({
          msg: "Đang xử lý...",
          desc: "Đang từ chối sự kiện và gửi thông báo",
          isSuccess: true,
          duration: 0,
        });
      } else if (payload.status === "closed") {
        Notice({
          msg: "Đang xử lý...",
          desc: "Đang đóng sự kiện và gửi thông báo",
          isSuccess: true,
          duration: 0,
        });
      }

      const res = await axios.put(
        `${API_BASE}/events/${editingEvent._id}`,
        payload
      );

      if (res.data.success) {
        let successMessage = `Trạng thái sự kiện "${editingEvent.title}" đã được cập nhật.`;

        if (payload.status === "rejected") {
          successMessage = `Sự kiện "${editingEvent.title}" đã bị từ chối và chuyển về bản nháp.`;
        } else if (payload.status === "closed") {
          successMessage = `Sự kiện "${editingEvent.title}" đã bị đóng.`;
        }

        Notice({
          msg: "Cập nhật thành công",
          desc: successMessage,
          isSuccess: true,
        });
        setModalVisible(false);
        fetchEvents();
      } else {
        Notice({
          msg: "Lỗi",
          desc: res.data.message || "Không thể cập nhật trạng thái sự kiện",
          isSuccess: false,
        });
      }
    } catch (error) {
      // Hiển thị lỗi validation từ form
      if (error.errorFields) {
        Notice({
          msg: "Lỗi",
          desc: "Vui lòng kiểm tra lại thông tin đã nhập",
          isSuccess: false,
        });
      } else {
        Notice({
          msg: "Lỗi",
          desc: error.message,
          isSuccess: false,
        });
      }
    } finally {
      // Kết thúc loading
      setUpdatingStatus(false);
      setUpdatingEventId(null);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value.toLowerCase());
  };

  // ✅ Cập nhật hàm lọc khi click vào card
  const handleCardFilter = (displayStatus) => {
    setStatusFilter(displayStatus);
  };

  // ✅ Reset tất cả bộ lọc
  const handleResetFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setSearchText("");
  };

  // Hàm kiểm tra xung đột sự kiện
  const checkEventConflict = async (eventData, currentEventId = null) => {
    try {
      // Nếu là sự kiện online, cho phép trùng
      if (
        eventData.location.toLowerCase().includes("online") ||
        eventData.location.toLowerCase().includes("trực tuyến")
      ) {
        return { hasConflict: false };
      }

      const checkPayload = {
        location: eventData.location,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        excludeEventId: currentEventId,
      };

      const res = await axios.post(
        `${API_BASE}/events/check-conflict`,
        checkPayload
      );

      if (res.data.success) {
        return res.data.data;
      } else {
        return {
          hasConflict: true,
          message: "Không thể kiểm tra xung đột sự kiện",
        };
      }
    } catch (error) {
      console.error("Error checking event conflict:", error);
      return {
        hasConflict: true,
        message: "Lỗi khi kiểm tra xung đột sự kiện",
      };
    }
  };

  // ✅ Logic lọc bảng
  const filteredEvents = events.filter((event) => {
    const matchStatus =
      statusFilter === "all" ||
      event.display_status?.toLowerCase() === statusFilter.toLowerCase();

    const matchCategory =
      categoryFilter === "all" ||
      event.category_id?._id === categoryFilter ||
      event.category_id?.name?.toLowerCase() === categoryFilter.toLowerCase();

    const matchSearch =
      event.title?.toLowerCase().includes(searchText) ||
      event.location?.toLowerCase().includes(searchText) ||
      event.category_id?.name?.toLowerCase().includes(searchText);

    return matchStatus && matchCategory && matchSearch;
  });

  // Hàm cắt ngắn địa điểm nếu quá dài
  const truncateLocation = (location, maxLength = 30) => {
    if (!location) return "Không có địa điểm";
    if (location.length <= maxLength) return location;
    return location.substring(0, maxLength) + "...";
  };

  // ==================== THỐNG KÊ ====================
  const totalEvents = events.length;
  const counts = {
    Draft: events.filter((e) => e.display_status === "Draft").length,
    Pending: events.filter((e) => e.display_status === "Pending").length,
    Approved: events.filter((e) => e.display_status === "Approved").length,
    Upcoming: events.filter((e) => e.display_status === "Upcoming").length,
    Ongoing: events.filter((e) => e.display_status === "Ongoing").length,
    Completed: events.filter((e) => e.display_status === "Completed").length,
    Closed: events.filter((e) => e.display_status === "Closed").length,
  };

  // ==================== CỘT BẢNG ====================
  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Tên sự kiện",
      dataIndex: "title",
      key: "title",
      align: "center",
      width: 200,
      render: (title) => (
        <Tooltip title={title} placement="topLeft">
          <div className={styles.truncateText}>{title}</div>
        </Tooltip>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: "category_id",
      key: "category",
      align: "center",
      width: 120,
      render: (category) => (
        <Tag color="blue">{category?.name || "Không có danh mục"}</Tag>
      ),
    },
    {
      title: "Địa điểm",
      dataIndex: "location",
      key: "location",
      align: "center",
      width: 180,
      render: (location) => (
        <Tooltip title={location} placement="topLeft">
          <div className={styles.truncateText}>
            {truncateLocation(location, 25)}
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "start_time",
      key: "time",
      align: "center",
      width: 200,
      render: (_, record) =>
        `${dayjs.utc(record.start_time).format("DD/MM/YYYY HH:mm")} - ${dayjs.utc(
          record.end_time
        ).format("DD/MM/YYYY HH:mm")} (UTC)`,
    },
    {
      title: "Trạng thái",
      dataIndex: "display_status",
      key: "display_status",
      align: "center",
      width: 100,
      render: (status, record) => {
        let color, text, icon;
        switch (status) {
          case "Draft":
            color = "default";
            text = "Bản nháp";
            icon = <FileExclamationOutlined />;
            break;
          case "Pending":
            color = "blue";
            text = "Chờ duyệt";
            icon = <HourglassOutlined />;
            break;
          case "Approved":
            color = "green";
            text = "Đã duyệt";
            icon = <CheckCircleOutlined />;
            break;
          case "Upcoming":
            color = "gold";
            text = "Sắp diễn ra";
            icon = <ClockCircleOutlined />;
            break;
          case "Ongoing":
            color = "green";
            text = "Đang diễn ra";
            icon = <PlayCircleOutlined />;
            break;
          case "Completed":
            color = "cyan";
            text = "Đã kết thúc";
            icon = <CheckCircleOutlined />;
            break;
          case "Closed":
            color = "red";
            text = "Đã bị buộc đóng";
            icon = <PoweroffOutlined />;
            break;
          default:
            color = "default";
            text = status || "Unknown";
            icon = <InfoCircleOutlined />;
        }

        // Kiểm tra nếu sự kiện bị khóa
        const now = new Date();
        const isLocked =
          record.status === "ongoing" ||
          record.status === "completed" ||
          record.status === "closed" ||
          (record.status === "approved" &&
            record.start_time &&
            new Date(record.start_time) <= now);

        return (
          <Tooltip
            title={isLocked ? "Sự kiện đã bị khóa - không thể chỉnh sửa" : ""}
          >
            <Tag color={color} icon={isLocked ? <LockOutlined /> : icon}>
              {text}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Hành động",
      key: "actions",
      align: "center",
      width: 120,
      fixed: "right",
      render: (_, record) => {
        // Kiểm tra xem sự kiện có bị khóa không
        const now = new Date();
        const isLocked =
          record.status === "ongoing" ||
          record.status === "completed" ||
          record.status === "closed" ||
          (record.status === "approved" &&
            record.start_time &&
            new Date(record.start_time) <= now);
        const canDelete = checkIfEventCanBeDeleted(record);
        return (
          <Space>
            {updatingStatus && updatingEventId === record._id ? (
              <Spin
                indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
                size="small"
              />
            ) : (
              <>
                <TooltipArrow title="Xem chi tiết" placement="top">
                  <Button
                    type="text"
                    icon={<EyeFilled />}
                    onClick={() => handleViewDetail(record)}
                  />
                </TooltipArrow>
                <TooltipArrow
                  title={
                    isLocked
                      ? "Sự kiện đã bị khóa - không thể chỉnh sửa"
                      : "Chỉnh sửa trạng thái"
                  }
                  placement="top"
                >
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}
                    disabled={isLocked}
                  />
                </TooltipArrow>
                <TooltipArrow
                  title={canDelete.allowed ? "Xóa" : canDelete.message}
                  placement="top"
                >
                  <Popconfirm
                    title="Bạn có chắc chắn muốn xóa sự kiện này?"
                    onConfirm={() => handleDelete(record._id)}
                    disabled={!canDelete.allowed}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!canDelete.allowed}
                    />
                  </Popconfirm>
                </TooltipArrow>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.manageEventsContainer}>
      <h1>Quản lý sự kiện</h1>

      {/* ==================== THỐNG KÊ ==================== */}
      <Row gutter={16} className={styles.statsRow}>
        <Col span={8}>
          <Card
            className={`${styles.statCard} ${
              statusFilter === "all" ? styles.activeCard : ""
            }`}
            onClick={() => handleCardFilter("all")}
          >
            <Statistic
              title="Tổng sự kiện"
              value={totalEvents}
              prefix={<CalendarOutlined style={{ color: "#ff7b00" }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            className={`${styles.statCard} ${
              statusFilter === "Pending" ? styles.activeCard : ""
            }`}
            onClick={() => handleCardFilter("Pending")}
          >
            <Statistic
              title="Chờ duyệt"
              value={counts.Pending}
              prefix={<HourglassOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            className={`${styles.statCard} ${
              statusFilter === "Closed" ? styles.activeCard : ""
            }`}
            onClick={() => handleCardFilter("Closed")}
          >
            <Statistic
              title="Đã bị buộc đóng"
              value={counts.Closed}
              prefix={<StopOutlined style={{ color: "#fa541c" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className={styles.statsRow}>
        <Col span={8}>
          <Card
            className={`${styles.statCard} ${
              statusFilter === "Upcoming" ? styles.activeCard : ""
            }`}
            onClick={() => handleCardFilter("Upcoming")}
          >
            <Statistic
              title="Sắp diễn ra"
              value={counts.Upcoming}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            className={`${styles.statCard} ${
              statusFilter === "Ongoing" ? styles.activeCard : ""
            }`}
            onClick={() => handleCardFilter("Ongoing")}
          >
            <Statistic
              title="Đang diễn ra"
              value={counts.Ongoing}
              prefix={<PlayCircleOutlined style={{ color: "#13c2c2" }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            className={`${styles.statCard} ${
              statusFilter === "Completed" ? styles.activeCard : ""
            }`}
            onClick={() => handleCardFilter("Completed")}
          >
            <Statistic
              title="Đã kết thúc"
              value={counts.Completed}
              prefix={<CheckCircleOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* ==================== TÌM KIẾM + LỌC ==================== */}
      <div className={styles.header}>
        <Space size="middle" wrap>
          <Input
            placeholder="Tìm kiếm sự kiện theo tiêu đề, địa điểm, danh mục..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
          />

          <Select
            placeholder="Lọc theo trạng thái"
            value={statusFilter}
            className={styles.filterSelect}
            onChange={setStatusFilter}
            style={{ width: 200 }}
          >
            <Option value="all">Tất cả trạng thái</Option>
            <Option value="Pending">Chờ duyệt</Option>
            <Option value="Upcoming">Sắp diễn ra</Option>
            <Option value="Ongoing">Đang diễn ra</Option>
            <Option value="Completed">Đã kết thúc</Option>
            <Option value="Closed">Đã bị buộc đóng</Option>
          </Select>

          <Select
            placeholder="Lọc theo danh mục"
            value={categoryFilter}
            className={styles.filterSelect}
            onChange={setCategoryFilter}
            style={{ width: 200 }}
          >
            <Option value="all">Tất cả danh mục</Option>
            {categories.map((category) => (
              <Option key={category._id} value={category._id}>
                {category.name}
              </Option>
            ))}
          </Select>

          <Button
            icon={<FilterOutlined />}
            onClick={handleResetFilters}
            style={{ background: "#f0f0f0" }}
          >
            Reset bộ lọc
          </Button>
        </Space>
      </div>

      {/* ==================== THÔNG TIN BỘ LỌC ĐANG ÁP DỤNG ==================== */}
      {(statusFilter !== "all" || categoryFilter !== "all" || searchText) && (
        <div className={styles.filterInfo}>
          <span>Bộ lọc đang áp dụng: </span>
          {statusFilter !== "all" && (
            <Tag color="blue">
              Trạng thái:{" "}
              {statusFilter === "Draft"
                ? "Bản nháp"
                : statusFilter === "Pending"
                ? "Chờ duyệt"
                : statusFilter === "Approved"
                ? "Đã duyệt"
                : statusFilter === "Upcoming"
                ? "Sắp diễn ra"
                : statusFilter === "Ongoing"
                ? "Đang diễn ra"
                : statusFilter === "Completed"
                ? "Đã kết thúc"
                : statusFilter === "Closed"
                ? "Đã bị buộc đóng"
                : statusFilter}
            </Tag>
          )}
          {categoryFilter !== "all" && (
            <Tag color="green">
              Danh mục:{" "}
              {categories.find((c) => c._id === categoryFilter)?.name ||
                categoryFilter}
            </Tag>
          )}
          {searchText && <Tag color="orange">Tìm kiếm: "{searchText}"</Tag>}
          <span className={styles.filterCount}>
            ({filteredEvents.length} kết quả)
          </span>
        </div>
      )}

      {/* ==================== BẢNG SỰ KIỆN ==================== */}
      <Table
        dataSource={filteredEvents}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: filteredEvents.length,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} của ${total} sự kiện`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 800 }}
        size="middle"
      />

      {/* ==================== MODAL CHỈNH SỬA TRẠNG THÁI ==================== */}
      <Modal
        title={`Chỉnh sửa trạng thái - ${editingEvent?.title || "Sự kiện"}`}
        open={modalVisible}
        onCancel={() => {
          if (!updatingStatus) {
            setModalVisible(false);
          }
        }}
        onOk={handleSubmit}
        okText="Cập nhật trạng thái"
        cancelText="Hủy"
        width={700}
        confirmLoading={updatingStatus}
        okButtonProps={{
          disabled: updatingStatus,
        }}
        cancelButtonProps={{
          disabled: updatingStatus,
        }}
      >
        {/* Hiển thị loading indicator nếu đang cập nhật */}
        {updatingStatus && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
              tip="Đang xử lý..."
              size="large"
            />
          </div>
        )}

        <Alert
          message="Thông tin"
          description="Chỉ có thể thay đổi trạng thái sự kiện. Nội dung sự kiện cần được chỉnh sửa bởi người tổ chức."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />

        {/* Thông tin chi tiết sự kiện */}
        {editingEvent && (
          <Descriptions
            bordered
            size="small"
            column={1}
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Tên sự kiện">
              {editingEvent.title}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả">
              {editingEvent.description || "Không có mô tả"}
            </Descriptions.Item>
            <Descriptions.Item label="Địa điểm">
              {editingEvent.location}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian">
              {dayjs.utc(editingEvent.start_time).format("DD/MM/YYYY HH:mm")} -{" "}
              {dayjs.utc(editingEvent.end_time).format("DD/MM/YYYY HH:mm")} (UTC)
            </Descriptions.Item>
            <Descriptions.Item label="Danh mục">
              {editingEvent.category_id?.name || "Không có danh mục"}
            </Descriptions.Item>
            <Descriptions.Item label="Người tổ chức">
              {editingEvent.seller_id?.full_name || "Không xác định"}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái hiện tại">
              <Tag
                color={
                  editingEvent.display_status === "Draft"
                    ? "default"
                    : editingEvent.display_status === "Pending"
                    ? "blue"
                    : editingEvent.display_status === "Approved"
                    ? "green"
                    : editingEvent.display_status === "Upcoming"
                    ? "gold"
                    : editingEvent.display_status === "Ongoing"
                    ? "green"
                    : editingEvent.display_status === "Completed"
                    ? "cyan"
                    : editingEvent.display_status === "Closed"
                    ? "red"
                    : "default"
                }
              >
                {getStatusLabel(editingEvent.status)}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}

        <Form form={form} layout="vertical">
          <Form.Item
            name="status"
            label="Trạng thái mới"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select
              placeholder="Chọn trạng thái"
              onChange={(value) => {
                // Reset rejection reason khi chuyển trạng thái khác
                if (value !== "rejected" && value !== "closed") {
                  form.setFieldValue("rejection_reason", undefined);
                }
              }}
              disabled={updatingStatus}
            >
              {editingEvent &&
                getAvailableStatusOptions(
                  editingEvent.status,
                  editingEvent.display_status
                ).map((option) => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          {/* Lý do từ chối/đóng - Hiển thị khi chọn rejected hoặc closed */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.status !== currentValues.status
            }
          >
            {() => {
              const status = form.getFieldValue("status");
              const showRejectionReason =
                status === "rejected" || status === "closed";
              const labelText =
                status === "rejected" ? "Lý do từ chối" : "Lý do đóng sự kiện";
              const placeholderText =
                status === "rejected"
                  ? "Nhập lý do từ chối sự kiện (sẽ được gửi cho người tổ chức và sự kiện sau khi được nhà tổ chức chỉnh sửa có thể yêu cầu duyệt lại)"
                  : "Nhập lý do đóng sự kiện (sẽ được gửi cho người tổ chức)";

              return showRejectionReason ? (
                <Form.Item
                  name="rejection_reason"
                  label={labelText}
                  rules={[
                    {
                      required: true,
                      message:
                        status === "rejected"
                          ? "Vui lòng nhập lý do từ chối"
                          : "Vui lòng nhập lý do đóng sự kiện",
                    },
                    {
                      min: 10,
                      message: "Lý do phải được nêu rõ cho người tạo sự kiện",
                    },
                  ]}
                >
                  <Input.TextArea
                    placeholder={placeholderText}
                    rows={3}
                    showCount
                    maxLength={500}
                    disabled={updatingStatus}
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ManageEvents;
