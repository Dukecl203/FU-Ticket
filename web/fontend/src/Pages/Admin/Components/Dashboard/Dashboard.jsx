import {
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  FileExclamationOutlined,
  ClockCircleOutlined,
  HourglassOutlined,
  StopOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  UndoOutlined, 
} from "@ant-design/icons";
import { Card, Col, Row, Statistic } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import { API_BASE } from "../../../../constants/constants";
import styles from "./Dashboard.module.scss";

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userRes, eventRes, transactionRes] = await Promise.all([
          axios.get(`${API_BASE}/users`),
          axios.get(`${API_BASE}/events/all-events`),
          axios.get(`${API_BASE}/events/transactions`),
        ]);

        if (userRes.data.success) setUsers(userRes.data.data);
        if (eventRes.data.success) setEvents(eventRes.data.data);
        if (transactionRes.data.success)
          setTransactions(transactionRes.data.data.transactions || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Users stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const inactiveUsers = users.filter((u) => u.status === "inactive").length;
  const adminUsers = users.filter((u) => u.role === "Admin").length;

  // Events stats
  const totalEvents = events.length;
  const pendingEvents = events.filter(
    (e) => e.display_status === "Pending"
  ).length;
  const ongoingEvents = events.filter(
    (e) => e.display_status === "Ongoing"
  ).length;
  const completedEvents = events.filter(
    (e) => e.display_status === "Completed"
  ).length;
  const upcomingEvents = events.filter(
    (e) => e.display_status === "Upcoming"
  ).length;
  const cancelledEvents = events.filter(
    (e) => e.display_status === "Closed"
  ).length;

  // Transactions stats
  const totalTransactions = transactions.length;
  const successfulTransactions = transactions.filter(
    (t) => t.status === "paid"
  ).length;
  const failedTransactions = transactions.filter(
    (t) => t.status === "cancelled"
  ).length;
  
  // THÊM: Tính tổng tiền đã hoàn trả
  const totalRefunded = transactions
    .filter((t) => t.status === "refunded")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalRevenue = transactions
    .filter((t) => t.status === "paid")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className={styles.dashboardContainer}>
      <Card loading={loading} bordered={false}>
        <h1>Dashboard</h1>
        <p className={styles.dashboardSubtitle}>
          Tổng quan hệ thống và thống kê
        </p>

        {/* Thống kê người dùng */}
        <h3 className={styles.dashboardCardtitle}>Thống kê người dùng</h3>
        <Row gutter={16} className={styles.statsRow}>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Tổng người dùng"
                value={totalUsers}
                prefix={<UserOutlined style={{ color: "#ff7b00" }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Quản trị viên"
                value={adminUsers}
                prefix={<UserOutlined style={{ color: "#003cffff" }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Đang hoạt động"
                value={activeUsers}
                prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Không hoạt động"
                value={inactiveUsers}
                prefix={<CloseCircleOutlined style={{ color: "#e90202ff" }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Thống kê sự kiện */}
        <h3 className={styles.dashboardCardtitle}>Thống kê sự kiện</h3>
        <Row gutter={16} className={styles.statsRow}>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Tổng sự kiện"
                value={totalEvents}
                prefix={<CalendarOutlined style={{ color: "#ff7b00" }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Chờ duyệt"
                value={pendingEvents}
                prefix={
                  <FileExclamationOutlined style={{ color: "#1890ff" }} />
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Đã bị buộc đóng"
                value={cancelledEvents}
                prefix={<StopOutlined style={{ color: "#fa541c" }} />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} className={styles.statsRow}>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Sắp diễn ra"
                value={upcomingEvents}
                prefix={<HourglassOutlined style={{ color: "#faad14" }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Đang diễn ra"
                value={ongoingEvents}
                prefix={<ClockCircleOutlined style={{ color: "#52c41a" }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Đã diễn ra"
                value={completedEvents}
                prefix={<CheckCircleOutlined style={{ color: "#13c2c2" }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Thống kê giao dịch */}
        <h3 className={styles.dashboardCardtitle}>Thống kê giao dịch</h3>
        <Row gutter={16} className={styles.statsRow}>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Tổng giao dịch"
                value={totalTransactions}
                prefix={<ShoppingCartOutlined style={{ color: "#722ed1" }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Giao dịch thành công"
                value={successfulTransactions}
                prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Tổng doanh thu"
                value={totalRevenue}
                prefix={<DollarOutlined style={{ color: "#faad14" }} />}
                formatter={(value) =>
                  `${Number(value).toLocaleString("vi-VN")} VNĐ`
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Tổng tiền đã hoàn trả"
                value={totalRefunded}
                prefix={<UndoOutlined style={{ color: "#ff7b00" }} />}
                formatter={(value) =>
                  `${Number(value).toLocaleString("vi-VN")} VNĐ`
                }
                valueStyle={{ color: "#ff7b00" }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}