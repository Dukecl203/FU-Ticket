import { ArrowLeftOutlined, LoadingOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Row,
  Table,
  Tag,
  Select,
  Space,
  Input,
  Modal,
  Form,
  Spin,
  Alert,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useEffect, useState, useRef } from "react";

// Enable UTC plugin for dayjs
dayjs.extend(utc);
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../../../../constants/constants";
import Notice from "../../../../component/Common/Notice/index";
import styles from "./ViewEventsDetail.module.scss";
import { io } from "socket.io-client";

const { Option } = Select;
const { TextArea } = Input;

const ViewEventsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [form] = Form.useForm();
  const socketRef = useRef(null);

  useEffect(() => {
    fetchEventDetail();
    setupSocketConnection();

    // Cleanup socket khi component unmount
    return () => {
      if (socketRef.current) {
        console.log("🔌 Cleaning up socket connection in ViewEventsDetail");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [id]);

  // Socket connection for real-time status updates
  const setupSocketConnection = () => {
    if (socketRef.current) {
      console.log("🔌 Socket already exists, skipping reconnection");
      return;
    }

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:9999";
    console.log("🔌 ViewEventsDetail: Connecting to socket:", socketUrl);

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        "✅ ViewEventsDetail: Connected to socket for event status updates"
      );

      // Join room cho event cụ thể này
      if (id) {
        socket.emit("join_event", id);
        console.log(`🎯 Joined event room: ${id}`);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("❌ ViewEventsDetail: Socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 ViewEventsDetail: Socket disconnected:", reason);
    });

    // Listen for event status changes từ backend
    socket.on("event_status_changed", (data) => {
      console.log("📢 ViewEventsDetail: Event status changed received:", data);

      // Chỉ xử lý nếu là event hiện tại
      if (data.eventId === id) {
        handleSocketStatusUpdate(data);
      }
    });

    // Listen for specific event status updates
    socket.on("event_status_update", (data) => {
      console.log("📢 ViewEventsDetail: Specific event status update:", data);

      if (data.eventId === id) {
        handleSocketStatusUpdate({
          eventId: data.eventId,
          newStatus: data.status,
          message: data.message,
          eventTitle: event?.title || "Sự kiện",
        });
      }
    });

    // Test connection
    socket.emit("test_connection", {
      message: "ViewEventsDetail client connected",
      eventId: id,
    });
  };

  // Xử lý cập nhật status từ socket
  const handleSocketStatusUpdate = (data) => {
    console.log(
      `🔄 ViewEventsDetail: Updating event status to ${data.newStatus}`
    );

    // Cập nhật state event
    setEvent((prevEvent) => {
      if (!prevEvent) return prevEvent;

      const updatedEvent = {
        ...prevEvent,
        status: data.newStatus,
      };

      // Tính toán lại display_status
      const displayStatus = getDisplayStatus(updatedEvent);

      return {
        ...updatedEvent,
        display_status: displayStatus,
      };
    });

    // Cập nhật status
    setStatus(data.newStatus);

    // Hiển thị notification
    Notice({
      msg: "Cập nhật trạng thái sự kiện",
      desc:
        data.message ||
        `Sự kiện "${data.eventTitle}" đã thay đổi trạng thái sang ${data.newStatus}`,
      isSuccess: true,
    });

    // Refresh data để đảm bảo đồng bộ
    setTimeout(() => {
      fetchEventDetail();
    }, 1000);
  };

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
          options.push({ value: "closed", label: "Đóng sự kiện" });
        }
        break;

      case "draft":
        // Khi là draft, có thể chuyển lên pending để duyệt lại
        options.push({ value: "pending", label: "Yêu cầu duyệt lại" });
        break;

      default:
        // Các trạng thái khác không thể thay đổi
        break;
    }

    return options;
  };

  // Hàm lấy label hiển thị cho giá trị status
  const getStatusLabel = (value) => {
    const statusLabels = {
      draft: "Bản nháp",
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      rejected: "Đã từ chối",
      closed: "Đã đóng",
      ongoing: "Đang diễn ra",
      completed: "Đã kết thúc",
    };
    return statusLabels[value] || value;
  };

  const fetchEventDetail = async () => {
    try {
      const res = await axios.get(`${API_BASE}/events/${id}`);
      if (res.data.success) {
        // Log detail value for debugging
        console.log("Event detail from API:", {
          type: typeof res.data.data.detail,
          value: res.data.data.detail,
          length: res.data.data.detail?.length,
        });

        // Ensure detail is always a string to prevent [object Object] rendering
        const detailValue = res.data.data.detail;
        let safeDetail = detailValue; // Default to original value

        if (detailValue !== null && detailValue !== undefined) {
          if (typeof detailValue !== "string") {
            // If it's not a string, log warning and try to convert
            console.warn(
              "Event detail is not a string, received:",
              typeof detailValue,
              detailValue
            );
            try {
              safeDetail = String(detailValue);
            } catch (e) {
              console.error("Could not convert detail to string:", e);
              safeDetail = "";
            }
          }
          // If it's a string, use it as-is (even if empty)
        } else {
          // If null/undefined, set to null so it doesn't render
          safeDetail = null;
        }

        const eventData = {
          ...res.data.data,
          detail: safeDetail, // Always set detail (can be null, empty string, or content)
          display_status: getDisplayStatus(res.data.data),
        };
        setEvent(eventData);
        setStatus(res.data.data.status);
      }

      const ticketRes = await axios.get(`${API_BASE}/binh/tickets/${id}`);
      if (ticketRes.data.success) {
        setTickets(ticketRes.data.data);
      }
    } catch (error) {
      console.error("Error fetching event detail:", error);
      Notice({
        msg: "Lỗi",
        desc: "Đã có lỗi xảy ra vui lòng kiểm tra lại",
        isSuccess: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (value) => {
    // Nếu chọn rejected hoặc closed, hiển thị modal nhập lý do
    if (value === "rejected" || value === "closed") {
      setPendingStatus(value);
      setRejectionModalVisible(true);
      return;
    }

    // Bắt đầu loading
    setUpdatingStatus(true);

    try {
      const payload = { status: value };

      // Kiểm tra xung đột nếu duyệt sự kiện
      if (value === "approved") {
        Notice({
          msg: "Đang kiểm tra...",
          desc: "Đang kiểm tra sự kiện có bị trùng trên hệ thống",
          isSuccess: true,
          duration: 0,
        });

        const conflictCheck = await checkEventConflict(event, id);
        if (conflictCheck.hasConflict) {
          Notice({
            msg: "Lỗi",
            desc: conflictCheck.message,
            isSuccess: false,
          });
          setUpdatingStatus(false);
          return;
        }

        Notice({
          msg: "Đang xử lý...",
          desc: "Đang duyệt sự kiện và gửi thông báo",
          isSuccess: true,
          duration: 0,
        });
      }

      const res = await axios.put(`${API_BASE}/events/${id}`, payload);
      if (res.data.success) {
        setStatus(value);
        await fetchEventDetail();

        // Hiển thị thông báo thành công với Notice
        if (value === "approved") {
          Notice({
            msg: "Thành công",
            desc: "Sự kiện đã được duyệt và sẽ hiển thị công khai. Email đã được gửi đến người tổ chức.",
            isSuccess: true,
          });
        } else if (value === "pending") {
          Notice({
            msg: "Thành công",
            desc: "Sự kiện đã được chuyển về trạng thái chờ duyệt",
            isSuccess: true,
          });
        } else {
          Notice({
            msg: "Thành công",
            desc: "Cập nhật trạng thái thành công",
            isSuccess: true,
          });
        }

        // Emit socket event để thông báo cho các client khác
        if (socketRef.current) {
          socketRef.current.emit("event_status_updated", {
            eventId: id,
            newStatus: value,
            eventTitle: event?.title,
          });
        }
      } else {
        Notice({
          msg: "Lỗi",
          desc: "Không thể cập nhật trạng thái",
          isSuccess: false,
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      Notice({
        msg: "Lỗi",
        desc: "Lỗi khi cập nhật trạng thái",
        isSuccess: false,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRejectionConfirm = async () => {
    // Bắt đầu loading
    setUpdatingStatus(true);

    try {
      // Validate lý do
      if (!rejectionReason || rejectionReason.trim().length < 10) {
        Notice({
          msg: "Lỗi",
          desc: "Vui lòng mô tả chi tiết lý do (ít nhất 10 ký tự)",
          isSuccess: false,
        });
        setUpdatingStatus(false);
        return;
      }

      const payload = {
        status: pendingStatus,
        rejection_reason: rejectionReason.trim(),
      };

      // Hiển thị thông báo đang xử lý
      Notice({
        msg: "Đang xử lý...",
        desc: `Đang ${
          pendingStatus === "rejected" ? "từ chối" : "đóng"
        } sự kiện và gửi thông báo`,
        isSuccess: true,
        duration: 0,
      });

      const res = await axios.put(`${API_BASE}/events/${id}`, payload);
      if (res.data.success) {
        setStatus(pendingStatus);
        setRejectionModalVisible(false);
        setRejectionReason("");
        await fetchEventDetail();

        // Hiển thị thông báo thành công với Notice
        if (pendingStatus === "rejected") {
          Notice({
            msg: "Thành công",
            desc: "Sự kiện đã bị từ chối và chuyển về bản nháp. Email đã được gửi đến người tổ chức.",
            isSuccess: true,
          });
        } else {
          Notice({
            msg: "Thành công",
            desc: "Sự kiện đã bị đóng. Email đã được gửi đến người tổ chức.",
            isSuccess: true,
          });
        }

        // Emit socket event để thông báo cho các client khác
        if (socketRef.current) {
          socketRef.current.emit("event_status_updated", {
            eventId: id,
            newStatus: pendingStatus,
            eventTitle: event?.title,
          });
        }
      } else {
        Notice({
          msg: "Lỗi",
          desc: "Không thể cập nhật trạng thái",
          isSuccess: false,
        });
      }
    } catch (error) {
      console.error("Error updating status with rejection:", error);
      Notice({
        msg: "Lỗi",
        desc: "Lỗi khi cập nhật trạng thái",
        isSuccess: false,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRejectionCancel = () => {
    setRejectionModalVisible(false);
    setRejectionReason("");
    setPendingStatus("");
    // Reset lại select về trạng thái hiện tại
    setStatus(event?.status || "");
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
          message: "Không thể kiểm tra sự kiện bị trùng",
        };
      }
    } catch (error) {
      console.error("Error checking event conflict:", error);
      return {
        hasConflict: true,
        message: "Lỗi khi kiểm tra sự kiện",
      };
    }
  };

  const renderStatusTag = (displayStatus) => {
    let color, text;
    switch (displayStatus) {
      case "Draft":
        color = "default";
        text = "Bản nháp";
        break;
      case "Pending":
        color = "blue";
        text = "Đang chờ duyệt";
        break;
      case "Approved":
        color = "green";
        text = "Đã duyệt";
        break;
      case "Upcoming":
        color = "gold";
        text = "Sắp diễn ra";
        break;
      case "Ongoing":
        color = "green";
        text = "Đang diễn ra";
        break;
      case "Completed":
        color = "cyan";
        text = "Đã kết thúc";
        break;
      case "Closed":
        color = "red";
        text = "Đã bị buộc đóng";
        break;
      default:
        color = "default";
        text = "Không xác định";
    }
    return <Tag color={color}>{text}</Tag>;
  };

  const columns = [
    {
      title: "Loại vé",
      dataIndex: "name",
      width: 180,
      align: "center",
      key: "name",
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      align: "center",
      key: "description",
    },
    {
      title: "Giá vé (VNĐ)",
      dataIndex: "price",
      width: 100,
      align: "center",
      key: "price",
      render: (price) => (
        <span className={styles.priceCell}>
          {price.toLocaleString("vi-VN")}
        </span>
      ),
    },
    {
      title: "Tổng số vé",
      dataIndex: "quantity_total",
      width: 120,
      align: "center",
      key: "quantity_total",
    },
    {
      title: "Đã bán",
      dataIndex: "quantity_sold",
      width: 100,
      align: "center",
      key: "quantity_sold",
    },
  ];

  if (loading) return <p>Đang tải dữ liệu...</p>;

  if (!event)
    return <p>Không tìm thấy thông tin sự kiện hoặc dữ liệu không hợp lệ.</p>;

  // Kiểm tra xem sự kiện có bị khóa không
  const now = new Date();
  const isLocked =
    event.status === "ongoing" ||
    event.status === "completed" ||
    event.status === "closed" ||
    (event.status === "approved" &&
      event.start_time &&
      new Date(event.start_time) <= now);

  const availableOptions = getAvailableStatusOptions(
    event.status,
    event.display_status
  );

  return (
    <div className={styles.viewEventDetailContainer}>
      <Button
        icon={<ArrowLeftOutlined />}
        className={styles.backButton}
        onClick={() => navigate(-1)}
      >
        Quay lại
      </Button>

      <h2>Chi tiết sự kiện</h2>

      {/* Thông tin sự kiện */}
      <Card
        title="Thông tin của sự kiện"
        className={styles.eventCard}
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div className={styles.eventInfo}>
              <p>
                <strong>Tiêu đề:</strong> {event.title}
              </p>
              <p>
                <strong>Mô tả:</strong> {event.description}
              </p>
              {event.detail &&
                typeof event.detail === "string" &&
                event.detail.trim() && (
                  <div style={{ marginTop: "12px" }}>
                    <strong>Nội dung chi tiết:</strong>
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "12px",
                        backgroundColor: "#f5f5f5",
                        borderRadius: "4px",
                        lineHeight: "1.6",
                      }}
                      dangerouslySetInnerHTML={{ __html: event.detail }}
                    />
                  </div>
                )}
              <p>
                <strong>Danh mục:</strong>{" "}
                <Tag color="blue">
                  {typeof event.category_id === "object" &&
                  event.category_id?.name
                    ? event.category_id.name
                    : typeof event.category_id === "string"
                    ? event.category_id
                    : "N/A"}
                </Tag>
              </p>
              <p>
                <strong>Địa điểm:</strong> {event.location}
              </p>
              <p>
                <strong>Thời gian:</strong>{" "}
                {`${dayjs.utc(event.start_time).format(
                  "DD/MM/YYYY HH:mm"
                )} - ${dayjs.utc(event.end_time).format("DD/MM/YYYY HH:mm")} (UTC)`}
              </p>
              {event.organizer ? (
                <>
                  <p>
                    <strong>Người tổ chức:</strong>{" "}
                    {typeof event.organizer === "object"
                      ? event.organizer.name || "N/A"
                      : String(event.organizer || "N/A")}
                  </p>
                  <p>
                    <strong>Email người tổ chức:</strong>{" "}
                    {typeof event.organizer === "object"
                      ? event.organizer.email || "N/A"
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Số điện thoại người tổ chức:</strong>{" "}
                    {typeof event.organizer === "object"
                      ? event.organizer.phone || "N/A"
                      : "N/A"}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Người tổ chức:</strong> {event.seller_id?.full_name}
                  </p>
                  <p>
                    <strong>Email người tổ chức:</strong>{" "}
                    {event.seller_id?.email}
                  </p>
                </>
              )}
              <p>
                <strong>Trạng thái:</strong>{" "}
                {renderStatusTag(event.display_status)}
              </p>

              {/* Cập nhật trạng thái */}
              <p>
                <strong>Cập nhật trạng thái:</strong>{" "}
                <Space>
                  {isLocked ? (
                    <Alert
                      message="Sự kiện đã bị khóa"
                      description="Không thể thay đổi trạng thái sự kiện đang diễn ra, đã kết thúc hoặc đã đóng."
                      type="warning"
                      showIcon
                      style={{ width: 400 }}
                    />
                  ) : availableOptions.length > 0 ? (
                    <>
                      <Select
                        value={status}
                        className={styles.statusSelect}
                        onChange={handleChangeStatus}
                        style={{ width: 200 }}
                        disabled={updatingStatus}
                        placeholder="Chọn trạng thái mới"
                      >
                        {availableOptions.map((option) => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                      {updatingStatus && (
                        <Spin
                          indicator={
                            <LoadingOutlined style={{ fontSize: 18 }} spin />
                          }
                          tip="Đang xử lý..."
                        />
                      )}
                    </>
                  ) : (
                    <Alert
                      message="Không có tùy chọn"
                      description="Không có trạng thái nào có thể chọn cho sự kiện này."
                      type="info"
                      showIcon
                      style={{ width: 400 }}
                    />
                  )}
                </Space>
              </p>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div className={styles.eventPoster}>
              {event.poster_url ? (
                <img src={event.poster_url} alt="Poster sự kiện" />
              ) : (
                <p>Chưa có ảnh poster</p>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Danh sách vé */}
      <Card title="Danh sách vé" className={styles.ticketTableCard}>
        <Table
          columns={columns}
          dataSource={tickets}
          pagination={false}
          rowKey="_id"
        />
      </Card>

      {/* Modal nhập lý do từ chối/đóng */}
      <Modal
        title={
          pendingStatus === "rejected"
            ? "Xác nhận từ chối sự kiện"
            : "Xác nhận đóng sự kiện"
        }
        open={rejectionModalVisible}
        onOk={handleRejectionConfirm}
        onCancel={handleRejectionCancel}
        okText={pendingStatus === "rejected" ? "Từ chối" : "Đóng sự kiện"}
        cancelText="Hủy"
        okButtonProps={{
          danger: pendingStatus === "rejected",
          style:
            pendingStatus === "closed"
              ? { backgroundColor: "#fa541c", borderColor: "#fa541c" }
              : {},
          disabled: updatingStatus,
        }}
        cancelButtonProps={{
          disabled: updatingStatus,
        }}
        confirmLoading={updatingStatus}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p>
            <strong>Sự kiện:</strong> {event?.title}
          </p>
          <p>
            <strong>Người tổ chức:</strong> {event?.seller_id?.full_name}
          </p>
          <p>
            Sự kiện này sẽ bị{" "}
            {pendingStatus === "rejected" ? "từ chối" : "đóng"}. Vui lòng cung
            cấp lý do cụ thể để người tổ chức hiểu và có thể cải thiện.
          </p>
        </div>

        <Form form={form} layout="vertical">
          <Form.Item
            label={
              pendingStatus === "rejected"
                ? "Lý do từ chối"
                : "Lý do đóng sự kiện"
            }
            required
            rules={[
              {
                required: true,
                message:
                  pendingStatus === "rejected"
                    ? "Vui lòng nhập lý do từ chối"
                    : "Vui lòng nhập lý do đóng sự kiện",
              },
              {
                min: 10,
                message: "Lý do phải có ít nhất 10 ký tự",
              },
            ]}
          >
            <TextArea
              placeholder={
                pendingStatus === "rejected"
                  ? "Nhập lý do từ chối sự kiện (sẽ được gửi cho người tổ chức và sự kiện sẽ chuyển về bản nháp)..."
                  : "Nhập lý do đóng sự kiện (sẽ được gửi cho người tổ chức)..."
              }
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              showCount
              maxLength={500}
              disabled={updatingStatus}
            />
          </Form.Item>
        </Form>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: "#fff2f0",
            borderRadius: 6,
          }}
        >
          <p style={{ margin: 0, color: "#a8071a", fontSize: "14px" }}>
            <strong>Lưu ý:</strong> Lý do này sẽ được gửi qua email cho người tổ
            chức ({event?.seller_id?.email})
            {pendingStatus === "rejected" &&
              " và sự kiện sẽ được chuyển về trạng thái bản nháp."}
          </p>
        </div>

        {updatingStatus && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Spin
              size="small"
              tip={`Đang ${
                pendingStatus === "rejected" ? "từ chối" : "đóng"
              } sự kiện...`}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ViewEventsDetail;
