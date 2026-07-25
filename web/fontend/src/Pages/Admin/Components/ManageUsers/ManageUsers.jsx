import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  UnlockOutlined,
  UserOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
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
} from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import Notice from "../../../../component/Common/Notice/index";
import TooltipArrow from "../../../../component/Common/TooltipArrow/index";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE,
  PAGINATION,
} from "../../../../constants/pageSizeOptions";
import { API_BASE } from "../../../../constants/constants";
import styles from "./ManageUsers.module.scss";

const { Option } = Select;

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeCard, setActiveCard] = useState("all");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isResetPasswordModalVisible, setIsResetPasswordModalVisible] =
    useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [form] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: PAGINATION.currentPage,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  // Fetch users từ backend
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE}/users`);
        if (response.data.success) {
          setUsers(response.data.data);
          setFilteredUsers(response.data.data);
        }
      } catch (err) {
        Notice({
          msg: "Lỗi",
          desc: err.message,
          isSuccess: false,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleTableChange = (newPagination) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  // Thống kê
  const activeUsers = users.filter((user) => user.status === "active").length;
  const inactiveUsers = users.filter(
    (user) => user.status === "inactive"
  ).length;
  const adminUsers = users.filter((user) => user.role === "Admin").length;

  // Handle search and filter
  const handleSearch = (value) => {
    setSearchText(value);
    filterUsers(value, statusFilter, roleFilter);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    filterUsers(searchText, value, roleFilter);
  };

  const handleRoleFilter = (value) => {
    setRoleFilter(value);
    filterUsers(searchText, statusFilter, value);
  };

  const filterUsers = (search, status, role) => {
    let filtered = users;
    if (search) {
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()) ||
          (user.phone_number && user.phone_number.includes(search))
      );
    }
    if (status !== "all") {
      filtered = filtered.filter((user) => user.status === status);
    }
    if (role !== "all") {
      filtered = filtered.filter((user) => user.role.toLowerCase() === role);
    }
    setFilteredUsers(filtered);
  };

  // Handle modal và form
  const showAddModal = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const showEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role.toLowerCase(),
      status: user.status,
    });
    setIsModalVisible(true);
  };

  // Handle reset password modal
  const showResetPasswordModal = (user) => {
    setResettingUser(user);
    resetPasswordForm.resetFields();
    setIsResetPasswordModalVisible(true);
  };

  const handleResetPassword = async () => {
    try {
      const response = await axios.post(
        `${API_BASE}/users/${resettingUser._id}/admin-reset-password`
      );

      if (response.data.success) {
        Notice({
          msg: "Reset mật khẩu thành công",
          desc: `Mật khẩu mới đã được gửi đến email ${resettingUser.email}.`,
          isSuccess: true,
        });
        setIsResetPasswordModalVisible(false);
        resetPasswordForm.resetFields();
      }
    } catch (err) {
      console.error("Reset password error:", err);
      Notice({
        msg: "Lỗi",
        desc:
          err.response?.data?.message ||
          "Không thể reset mật khẩu. Vui lòng thử lại.",
        isSuccess: false,
      });
    }
  };

  const handleResetPasswordCancel = () => {
    setIsResetPasswordModalVisible(false);
    resetPasswordForm.resetFields();
  };

 const handleModalOk = async () => {
  try {
    const values = await form.validateFields();
    
    // Kiểm tra và tự động set role dựa trên email domain
    let finalRole = values.role;
    const email = values.email.toLowerCase();
    
    // Chỉ cho phép set Organizer nếu email có domain @fpt.edu.vn hoặc @fe.edu.vn
    if (values.role === 'organizer') {
      const allowedDomains = ['@fpt.edu.vn', '@fe.edu.vn'];
      const hasAllowedDomain = allowedDomains.some(domain => email.includes(domain));
      
      if (!hasAllowedDomain) {
        Notice({
          msg: "Lỗi",
          desc: "Chỉ email có domain @fpt.edu.vn hoặc @fe.edu.vn mới được đăng ký làm Organizer.",
          isSuccess: false,
        });
        return;
      }
    }

    const payload = {
      ...values,
      role: finalRole.charAt(0).toUpperCase() + finalRole.slice(1),
      password_hash: editingUser ? undefined : "default_password",
    };

    let response;
    if (editingUser) {
      response = await axios.put(
        `${API_BASE}/users/${editingUser._id}`,
        payload
      );
    } else {
      response = await axios.post(`${API_BASE}/users`, payload);
    }

    if (response.data.success) {
      Notice({
        msg: editingUser
          ? "Cập nhật thành công"
          : "Thêm người dùng thành công",
        desc: `Người dùng ${payload.full_name} đã được ${
          editingUser ? "cập nhật" : "thêm"
        }.`,
        isSuccess: true,
      });
      const updatedResponse = await axios.get(`${API_BASE}/users`);
      setUsers(updatedResponse.data.data);
      setFilteredUsers(updatedResponse.data.data);
      setIsModalVisible(false);
      form.resetFields();
    }
  } catch (err) {
    Notice({
      msg: "Lỗi",
      desc: err.response?.data?.message || "Email đã tồn tại",
      isSuccess: false,
    });
  }
};

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`${API_BASE}/users/${id}`);
      if (response.data.success) {
        Notice({
          msg: "Xóa thành công",
          desc: "Người dùng đã được xóa.",
          isSuccess: true,
        });
        const updatedResponse = await axios.get(`${API_BASE}/users`);
        setUsers(updatedResponse.data.data);
        setFilteredUsers(updatedResponse.data.data);
      }
    } catch (err) {
      Notice({
        msg: "Lỗi",
        desc: err.message,
        isSuccess: false,
      });
    }
  };

  const handleBan = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const actionText = currentStatus === "active" ? "Cấm" : "Bỏ cấm";
    try {
      const response = await axios.put(`${API_BASE}/users/${id}`, {
        status: newStatus,
      });
      if (response.data.success) {
        Notice({
          msg: `${actionText} thành công`,
          desc: `Người dùng đã được ${actionText.toLowerCase()}.`,
          isSuccess: true,
        });
        const updatedResponse = await axios.get(`${API_BASE}/users`);
        setUsers(updatedResponse.data.data);
        setFilteredUsers(updatedResponse.data.data);
      }
    } catch (err) {
      Notice({
        msg: "Lỗi",
        desc: "Lỗi từ server",
        isSuccess: false,
      });
    }
  };

  // Columns cho bảng
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
      title: "Tên",
      dataIndex: "full_name",
      key: "full_name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone_number",
      key: "phone_number",
      render: (phone) => phone || "N/A",
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag
          color={
            role === "Admin" ? "red" : role === "Organizer" ? "blue" : "green"
          }
        >
          {role}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "active" ? "green" : "red"}>
          {status === "active" ? "Hoạt động" : "Không hoạt động"}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <TooltipArrow title="Sửa" lineClamp={1} maxWidth={100}>
            <Button
              icon={<EditOutlined />}
              onClick={() => showEditModal(record)}
            />
          </TooltipArrow>

          <TooltipArrow title="Reset mật khẩu" lineClamp={1} maxWidth={100}>
            <Button
              onClick={() => showResetPasswordModal(record)}
              icon={<KeyOutlined />}
              type="default"
            />
          </TooltipArrow>

          {record.role !== "Admin" && (
            <TooltipArrow title="Xóa" lineClamp={1} maxWidth={100}>
              <Popconfirm
                title="Bạn có chắc muốn xóa?"
                onConfirm={() => handleDelete(record._id)}
              >
                <Button icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </TooltipArrow>
          )}
          {record.role !== "Admin" && (
            <TooltipArrow
              title={record.status === "active" ? "Cấm" : "Bỏ cấm"}
              lineClamp={1}
              maxWidth={100}
            >
              <Popconfirm
                title={`Bạn có chắc muốn ${
                  record.status === "active" ? "cấm" : "bỏ cấm"
                } người dùng này?`}
                onConfirm={() => handleBan(record._id, record.status)}
              >
                <Button
                  icon={
                    record.status === "active" ? (
                      <StopOutlined />
                    ) : (
                      <UnlockOutlined />
                    )
                  }
                  type={record.status === "active" ? "primary" : "default"}
                  danger={record.status === "active"}
                />
              </Popconfirm>
            </TooltipArrow>
          )}
        </Space>
      ),
    },
  ];

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error}</div>;

  return (
    <div className={styles.manageUsersContainer}>
      <h1>Quản lý người dùng</h1>
      <Row gutter={16} className={styles.statsRow}>
        <Col span={6}>
          <Card
            className={`${styles.statCard} ${
              activeCard === "all" ? styles.activeCard : ""
            }`}
            onClick={() => {
              setActiveCard("all");
              setFilteredUsers(users);
            }}
          >
            <Statistic
              title="Tổng người dùng"
              value={users.length}
              prefix={<UserOutlined style={{ color: "#ff7b00" }} />}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card
            className={`${styles.statCard} ${
              activeCard === "admin" ? styles.activeCard : ""
            }`}
            onClick={() => {
              setActiveCard("admin");
              setFilteredUsers(users.filter((u) => u.role === "Admin"));
            }}
          >
            <Statistic
              title="Quản trị viên"
              value={adminUsers}
              prefix={<UserOutlined style={{ color: "#003cffff" }} />}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card
            className={`${styles.statCard} ${
              activeCard === "active" ? styles.activeCard : ""
            }`}
            onClick={() => {
              setActiveCard("active");
              setFilteredUsers(users.filter((u) => u.status === "active"));
            }}
          >
            <Statistic
              title="Đang hoạt động"
              value={activeUsers}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card
            className={`${styles.statCard} ${
              activeCard === "inactive" ? styles.activeCard : ""
            }`}
            onClick={() => {
              setActiveCard("inactive");
              setFilteredUsers(users.filter((u) => u.status === "inactive"));
            }}
          >
            <Statistic
              title="Không hoạt động"
              value={inactiveUsers}
              prefix={<CloseCircleOutlined style={{ color: "#e90202ff" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card className={styles.filterCard}>
        <div className={styles.filterSection}>
          <Input
            className={styles.searchInput}
            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
            prefix={<SearchOutlined />}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <Select
            className={styles.filterSelect}
            placeholder="Lọc theo trạng thái"
            defaultValue="all"
            onChange={handleStatusFilter}
          >
            <Option value="all">Tất cả</Option>
            <Option value="active">Hoạt động</Option>
            <Option value="inactive">Không hoạt động</Option>
          </Select>
          <Select
            className={styles.filterSelect}
            placeholder="Lọc theo vai trò"
            defaultValue="all"
            onChange={handleRoleFilter}
          >
            <Option value="all">Tất cả</Option>
            <Option value="admin">Admin</Option>
            <Option value="organizer">Organizer</Option>
            <Option value="participant">Participant</Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className={styles.addButton}
            onClick={showAddModal}
          >
            Thêm người dùng
          </Button>
        </div>
      </Card>

      <Card className={styles.tableCard}>
        <Table
          key="users-table"
          className={styles.usersTable}
          columns={columns}
          loading={loading}
          dataSource={filteredUsers}
          rowKey="_id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: filteredUsers.length,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Modal thêm/sửa người dùng */}
      <Modal
        title={editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
        className={styles.userModal}
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={[
          <Button
            key="cancel"
            className={styles.cancelButton}
            onClick={handleModalCancel}
          >
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            className={styles.submitButton}
            onClick={handleModalOk}
          >
            {editingUser ? "Cập nhật" : "Thêm"}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" className={styles.formItem}>
          <Form.Item
            name="full_name"
            label="Tên"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input id="user-full-name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              {
                required: true,
                type: "email",
                message: "Vui lòng nhập email hợp lệ",
              },
            ]}
          >
            <Input id="user-email" />
          </Form.Item>
          <Form.Item
            name="phone_number"
            label="Số điện thoại"
            rules={[
              { required: false, message: "Vui lòng nhập số điện thoại" },
            ]}
          >
            <Input id="user-phone" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
          >
            <Select id="user-role">
              <Option value="admin">Admin</Option>
              <Option value="organizer">Organizer</Option>
              <Option value="participant">Participant</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select id="user-status">
              <Option value="active">Hoạt động</Option>
              <Option value="inactive">Không hoạt động</Option>
            </Select>
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password_hash"
              label="Mật khẩu"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
            >
              <Input.Password id="user-password" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal reset mật khẩu */}
      <Modal
        title="Reset mật khẩu"
        className={styles.userModal}
        open={isResetPasswordModalVisible}
        onCancel={handleResetPasswordCancel}
        footer={[
          <Button
            key="cancel"
            className={styles.cancelButton}
            onClick={handleResetPasswordCancel}
          >
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            className={styles.submitButton}
            onClick={handleResetPassword}
          >
            Gửi email
          </Button>,
        ]}
      >
        <Form form={resetPasswordForm} layout="vertical">
          <p>
            Bạn có chắc muốn reset mật khẩu cho người dùng{" "}
            <strong>{resettingUser?.full_name}</strong>?
          </p>
          <p>
            Một email chứa link reset mật khẩu sẽ được gửi đến:{" "}
            <strong>{resettingUser?.email}</strong>
          </p>
        </Form>
      </Modal>
    </div>
  );
}
