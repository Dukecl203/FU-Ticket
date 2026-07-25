import React, { useState, useEffect } from "react";
import {
  Modal,
  Input,
  Button,
  List,
  Avatar,
  Space,
  Typography,
  message,
  Select,
  Tag,
  Popconfirm,
  Spin,
} from "antd";
import {
  UserOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;
const { Option } = Select;

const roleOptions = [
  { value: "ticket_scanner", label: "Ticket Scanner", color: "blue" },
  { value: "event_manager", label: "Event Manager", color: "green" },
  { value: "general_helper", label: "General Helper", color: "orange" },
];

const statusOptions = [
  { value: "pending", label: "Pending", color: "orange" },
  { value: "completed", label: "Completed", color: "blue" },
  { value: "cancelled", label: "Cancelled", color: "red" },
];

const CollaboratorModal = ({ visible, onClose, eventId, eventTitle }) => {
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (visible && eventId) {
      fetchCollaborators();
    }
  }, [visible, eventId]);

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:9999/api/collaborators/event/${eventId}`
      );
      setCollaborators(response.data.data || []);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
      message.error("Không thể tải danh sách cộng tác viên!");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (value) => {
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      // Search for users, excluding the event owner and existing collaborators
      // Backend will filter out: 1) Event owner (yourself) 2) Already added collaborators
      const response = await axios.get(
        `http://localhost:9999/api/collaborators/search?user_id=${encodeURIComponent(
          value
        )}&limit=10&eventId=${eventId}`
      );
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      message.error("Không thể tìm kiếm người dùng!");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    searchUsers(value);
  };

  const addCollaborator = async (user) => {
    try {
      const response = await axios.post(
        `http://localhost:9999/api/collaborators/event/${eventId}`,
        {
          collaborator_id: user._id,
          role: "ticket_scanner",
        }
      );

      if (response.data.success) {
        message.success(`Đã thêm ${user.full_name} làm cộng tác viên!`);
        fetchCollaborators();
        // Remove from search results
        setSearchResults((prev) => prev.filter((u) => u._id !== user._id));
      }
    } catch (error) {
      console.error("Error adding collaborator:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Không thể thêm cộng tác viên!");
      }
    }
  };

  const removeCollaborator = async (collaboratorId) => {
    try {
      const response = await axios.delete(
        `http://localhost:9999/api/collaborators/event/${eventId}/collaborator/${collaboratorId}`
      );

      if (response.data.success) {
        message.success("Đã xóa cộng tác viên!");
        fetchCollaborators();
      }
    } catch (error) {
      console.error("Error removing collaborator:", error);
      message.error("Không thể xóa cộng tác viên!");
    }
  };

  const updateCollaboratorStatus = async (collaboratorId, status) => {
    try {
      const response = await axios.put(
        `http://localhost:9999/api/collaborators/event/${eventId}/collaborator/${collaboratorId}`,
        { status }
      );

      if (response.data.success) {
        message.success("Đã cập nhật trạng thái!");
        fetchCollaborators();
      }
    } catch (error) {
      console.error("Error updating collaborator status:", error);
      message.error("Không thể cập nhật trạng thái!");
    }
  };

  const getRoleLabel = (role) => {
    const roleOption = roleOptions.find((r) => r.value === role);
    return roleOption ? roleOption.label : role;
  };

  const getRoleColor = (role) => {
    const roleOption = roleOptions.find((r) => r.value === role);
    return roleOption ? roleOption.color : "default";
  };

  const getStatusLabel = (status) => {
    const statusOption = statusOptions.find((s) => s.value === status);
    return statusOption ? statusOption.label : status;
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find((s) => s.value === status);
    return statusOption ? statusOption.color : "default";
  };

  return (
    <Modal
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý cộng tác viên
          </Title>
          <Text type="secondary">{eventTitle}</Text>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button
          key="scanning"
          type="primary"
          icon={<QrcodeOutlined />}
          onClick={() => {
            // Navigate to ticket scanning page
            window.open(`/organizer/events/${eventId}/pending`, "_blank");
          }}
        >
          Quét vé
        </Button>,
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={800}
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Search Section */}
        <div>
          <Title level={5}>Tìm kiếm người dùng</Title>
          <Input
            placeholder="Nhập tên hoặc email để tìm kiếm..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            loading={searchLoading || undefined}
          />
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            💡 Bạn có thể tìm kiếm bằng: tên người dùng hoặc email
          </div>

          {searchResults.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Title level={5}>Kết quả tìm kiếm:</Title>
              <List
                size="small"
                dataSource={searchResults}
                renderItem={(user) => (
                  <List.Item
                    actions={[
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => addCollaborator(user)}
                      >
                        Thêm
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={user.full_name}
                      description={
                        <div>
                          <div>Email: {user.email}</div>
                          <div>Role: {user.role}</div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>

        {/* Current Collaborators */}
        <div>
          <Title level={5}>Cộng tác viên hiện tại</Title>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <Spin />
            </div>
          ) : collaborators.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#999" }}>
              Chưa có cộng tác viên nào
            </div>
          ) : (
            <List
              dataSource={collaborators}
              renderItem={(collaboration) => {
                const user = collaboration.collaborator_id;
                return (
                  <List.Item
                    actions={[
                      <Select
                        size="small"
                        value={collaboration.status}
                        onChange={(status) =>
                          updateCollaboratorStatus(
                            collaboration.collaborator_id._id,
                            status
                          )
                        }
                        style={{ width: 100 }}
                      >
                        {statusOptions.map((status) => (
                          <Option key={status.value} value={status.value}>
                            {status.label}
                          </Option>
                        ))}
                      </Select>,
                      <Popconfirm
                        title="Bạn có chắc muốn xóa cộng tác viên này?"
                        onConfirm={() =>
                          removeCollaborator(collaboration.collaborator_id._id)
                        }
                        okText="Xóa"
                        cancelText="Hủy"
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>{user.full_name}</span>
                          <Tag color={getRoleColor(collaboration.role)}>
                            {getRoleLabel(collaboration.role)}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <div>Email: {user.email}</div>
                          <div>Role: {user.role}</div>
                          <div>
                            Trạng thái:{" "}
                            <Tag color={getStatusColor(collaboration.status)}>
                              {getStatusLabel(collaboration.status)}
                            </Tag>
                          </div>
                          {collaboration.notes && (
                            <div>Ghi chú: {collaboration.notes}</div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default CollaboratorModal;
