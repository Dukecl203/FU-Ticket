import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Button,
  message,
  Space,
  Divider,
  Typography,
  Tag,
  Progress,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const DiscountModal = ({ visible, onClose, eventId, eventTitle }) => {
  const [form] = Form.useForm();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    if (visible && eventId) {
      fetchEventDetails();
      fetchDiscounts();
    }
  }, [visible, eventId]);

  const fetchEventDetails = async () => {
    if (!eventId) return;

    try {
      const response = await axios.get(
        `http://localhost:9999/api/events/${eventId}`
      );
      setEventData(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching event details:", error);
    }
  };

  const fetchDiscounts = async () => {
    if (!eventId) {
      setDiscounts([]);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:9999/api/discounts/event/${eventId}`
      );
      setDiscounts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching discounts:", error);
      message.error("Không thể tải danh sách mã giảm giá!");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscount = () => {
    setEditingDiscount(null);
    form.resetFields();

    // Set default dates - from today until event end (or 30 days)
    let defaultValidFrom = dayjs();
    let defaultValidTo = dayjs().add(30, "day");

    if (eventData) {
      const eventEnd = dayjs(eventData.end_time);

      // Set valid_to to event end or 30 days from now, whichever is earlier
      const thirtyDaysFromNow = dayjs().add(30, "day");
      defaultValidTo = thirtyDaysFromNow.isAfter(eventEnd)
        ? eventEnd
        : thirtyDaysFromNow;
    }

    form.setFieldsValue({
      type: "All",
      percentage: 10,
      max_users: 0,
      valid_from: defaultValidFrom,
      valid_to: defaultValidTo,
    });
    setModalVisible(true);
  };

  const handleEditDiscount = (discount) => {
    setEditingDiscount(discount);
    form.setFieldsValue({
      code: discount.code,
      description: discount.description,
      percentage: discount.percentage,
      max_users: discount.max_users,
      valid_from: dayjs(discount.valid_from),
      valid_to: dayjs(discount.valid_to),
      type: discount.type,
    });
    setModalVisible(true);
  };

  const handleDeleteDiscount = async (discountId) => {
    try {
      await axios.delete(`http://localhost:9999/api/discounts/${discountId}`);
      message.success("Xóa mã giảm giá thành công!");
      fetchDiscounts();
    } catch (error) {
      console.error("Error deleting discount:", error);
      message.error("Không thể xóa mã giảm giá!");
    }
  };

  const handleModalOk = async () => {
    if (!eventId) {
      message.warning("Vui lòng tạo sự kiện trước khi thêm mã giảm giá!");
      return;
    }

    try {
      // Validate all fields immediately and show errors right away
      const values = await form.validateFields();

      // If validation passes, continue with save

      const payload = {
        code: values.code,
        description: values.description,
        percentage: values.percentage,
        max_users: values.max_users || 0,
        valid_from: values.valid_from.toDate(),
        valid_to: values.valid_to.toDate(),
        type: values.type,
      };

      if (editingDiscount) {
        await axios.put(
          `http://localhost:9999/api/discounts/${editingDiscount._id}`,
          payload
        );
        message.success("Cập nhật mã giảm giá thành công!");
      } else {
        await axios.post(
          `http://localhost:9999/api/discounts/event/${eventId}`,
          payload
        );
        message.success("Tạo mã giảm giá thành công!");
      }

      setModalVisible(false);
      form.resetFields();
      fetchDiscounts();
    } catch (error) {
      // Check if this is a form validation error
      if (error.errorFields) {
        // This is a validation error - Ant Design already shows errors on fields
        // Scroll to first error field for better UX
        const firstErrorField = error.errorFields[0]?.name?.[0];
        if (firstErrorField) {
          // Convert field name from snake_case to kebab-case for ID matching
          const fieldId = firstErrorField.replace(/_/g, "-");
          const fieldElement = document.querySelector(
            `[id="modal-discount-${fieldId}"]`
          );
          if (fieldElement) {
            fieldElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }
        // Don't show console error for validation failures
        return;
      }

      // Handle API/network errors
      if (error.response?.data?.message) {
        const errorMsg = error.response.data.message;

        // Show error on the appropriate field
        if (
          errorMsg.includes("code already exists") ||
          errorMsg.includes("Discount code already exists") ||
          errorMsg.includes("đã được sử dụng cho sự kiện này")
        ) {
          form.setFields([
            {
              name: "code",
              errors: [
                "Mã giảm giá này đã được sử dụng cho sự kiện này. Vui lòng chọn mã khác!",
              ],
            },
          ]);
        } else if (errorMsg.includes("Valid from date must be before")) {
          form.setFields([
            {
              name: "valid_to",
              errors: ["Ngày kết thúc phải sau ngày bắt đầu!"],
            },
          ]);
        } else if (errorMsg.includes("Event not found")) {
          message.error("Sự kiện không tồn tại!");
        } else {
          message.error(errorMsg);
        }
      } else {
        message.error("Không thể lưu mã giảm giá!");
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingDiscount(null);
  };

  const getDiscountStatus = (discount) => {
    const now = new Date();
    const validFrom = new Date(discount.valid_from);
    const validTo = new Date(discount.valid_to);

    if (now < validFrom) {
      return { status: "not-started", color: "blue", text: "Chưa bắt đầu" };
    } else if (now > validTo) {
      return { status: "expired", color: "red", text: "Đã hết hạn" };
    } else if (
      discount.max_users > 0 &&
      discount.usageCount >= discount.max_users
    ) {
      return { status: "full", color: "orange", text: "Đã hết lượt" };
    } else {
      return { status: "active", color: "green", text: "Đang hoạt động" };
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "All":
        return "purple";
      case "Ticket":
        return "blue";
      case "Merch":
        return "green";
      default:
        return "default";
    }
  };

  return (
    <>
      <Modal
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Quản lý mã giảm giá
            </Title>
            <Text type="secondary">{eventTitle}</Text>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Đóng
          </Button>,
        ]}
        width={900}
        destroyOnClose
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              Danh sách mã giảm giá ({discounts.length})
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateDiscount}
              disabled={!eventId}
            >
              Thêm mã giảm giá
            </Button>
          </div>

          {!eventId ? (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
              <div style={{ fontSize: 16, marginBottom: 8 }}>
                💡 Tạo sự kiện trước để quản lý mã giảm giá
              </div>
              <div style={{ fontSize: 14 }}>
                Sau khi tạo sự kiện thành công, bạn có thể thêm các mã giảm giá
                cho sự kiện
              </div>
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div>Đang tải...</div>
            </div>
          ) : discounts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
              Chưa có mã giảm giá nào
            </div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {discounts.map((discount) => {
                const status = getDiscountStatus(discount);
                return (
                  <div
                    key={discount._id}
                    style={{
                      border: "1px solid #f0f0f0",
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 12,
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <Row gutter={16} align="middle">
                      <Col span={6}>
                        <Space direction="vertical" size="small">
                          <Text strong style={{ fontSize: 16 }}>
                            {discount.code}
                          </Text>
                          <Tag color={getTypeColor(discount.type)}>
                            {discount.type}
                          </Tag>
                          <Tag color={status.color}>{status.text}</Tag>
                        </Space>
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="Giảm giá"
                          value={discount.percentage}
                          suffix="%"
                          valueStyle={{ color: "#3f8600" }}
                        />
                      </Col>
                      <Col span={6}>
                        <Space direction="vertical" size="small">
                          <Text type="secondary">
                            <CalendarOutlined />{" "}
                            {dayjs(discount.valid_from).format("DD/MM/YYYY")}
                          </Text>
                          <Text type="secondary">
                            <CalendarOutlined />{" "}
                            {dayjs(discount.valid_to).format("DD/MM/YYYY")}
                          </Text>
                        </Space>
                      </Col>
                      <Col span={6}>
                        <Space direction="vertical" size="small">
                          <Text>
                            <UserOutlined /> {discount.usageCount}/
                            {discount.max_users || "∞"}
                          </Text>
                          {discount.max_users > 0 && (
                            <Progress
                              percent={parseFloat(discount.usagePercentage)}
                              size="small"
                              showInfo={false}
                            />
                          )}
                        </Space>
                      </Col>
                    </Row>

                    {discount.description && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">{discount.description}</Text>
                      </div>
                    )}

                    <Divider style={{ margin: "12px 0" }} />

                    <Space>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditDiscount(discount)}
                      >
                        Chỉnh sửa
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteDiscount(discount._id)}
                      >
                        Xóa
                      </Button>
                    </Space>
                  </div>
                );
              })}
            </div>
          )}
        </Space>
      </Modal>

      {/* Create/Edit Discount Modal */}
      <Modal
        title={editingDiscount ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá"}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Mã giảm giá"
                rules={[
                  { required: true, message: "Nhập mã giảm giá" },
                  { min: 3, message: "Mã giảm giá phải có ít nhất 3 ký tự" },
                  {
                    pattern: /^[A-Z0-9]+$/,
                    message: "Mã giảm giá chỉ được chứa chữ in hoa và số",
                  },
                ]}
                tooltip="Mã giảm giá phải là chữ in hoa và số, không có khoảng trắng. Mã giảm giá phải duy nhất trong cùng một sự kiện, nhưng có thể dùng lại cho sự kiện khác."
              >
                <Input
                  id="modal-discount-code"
                  placeholder="VD: SALE20"
                  style={{ textTransform: "uppercase" }}
                  onChange={(e) => {
                    // Auto-convert to uppercase
                    const value = e.target.value.toUpperCase();
                    form.setFieldValue("code", value);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="percentage"
                label="Phần trăm giảm giá (%)"
                rules={[
                  { required: true, message: "Nhập phần trăm giảm giá" },
                  {
                    type: "number",
                    min: 1,
                    max: 100,
                    message: "Phần trăm phải từ 1-100",
                  },
                ]}
              >
                <InputNumber
                  id="modal-discount-percentage"
                  min={1}
                  max={100}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea
              id="modal-discount-description"
              rows={2}
              placeholder="Mô tả về mã giảm giá..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Loại sản phẩm"
                rules={[{ required: true, message: "Chọn loại sản phẩm" }]}
              >
                <Select id="modal-discount-type" placeholder="Chọn loại">
                  <Option value="All">Tất cả</Option>
                  <Option value="Ticket">Vé</Option>
                  <Option value="Merch">Hàng hóa</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="max_users"
                label="Số lượt sử dụng tối đa"
                tooltip="Để 0 nếu không giới hạn"
              >
                <InputNumber
                  id="modal-discount-max-users"
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="valid_from"
            label="Thời gian bắt đầu"
            rules={[
              { required: true, message: "Chọn thời gian bắt đầu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) {
                    return Promise.reject(
                      new Error("Vui lòng chọn thời gian bắt đầu!")
                    );
                  }

                  // Check if date is in the past
                  if (value.isBefore(dayjs(), "day")) {
                    return Promise.reject(
                      new Error("Không thể chọn ngày đã qua!")
                    );
                  }

                  // Check if date is after event end
                  if (
                    eventData &&
                    value.isAfter(dayjs(eventData.end_time), "day")
                  ) {
                    return Promise.reject(
                      new Error("Ngày bắt đầu phải trước khi sự kiện kết thúc!")
                    );
                  }

                  // Check if valid_from is after valid_to
                  const validTo = getFieldValue("valid_to");
                  if (validTo && value.isAfter(validTo)) {
                    return Promise.reject(
                      new Error("Ngày bắt đầu phải trước ngày kết thúc!")
                    );
                  }

                  return Promise.resolve();
                },
              }),
            ]}
            dependencies={["valid_to"]}
          >
            <DatePicker
              id="modal-discount-valid-from"
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: "100%" }}
              disabledDate={(current) => {
                if (!current) return false;

                // Disable dates before today
                if (current < dayjs().startOf("day")) {
                  return true;
                }

                // If event data is available, disable dates after event end
                if (eventData) {
                  const eventEnd = dayjs(eventData.end_time).startOf("day");
                  return current > eventEnd;
                }

                return false;
              }}
            />
          </Form.Item>

          <Form.Item
            name="valid_to"
            label="Thời gian kết thúc"
            rules={[
              { required: true, message: "Chọn thời gian kết thúc" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) {
                    return Promise.reject(
                      new Error("Vui lòng chọn thời gian kết thúc!")
                    );
                  }

                  const validFrom = getFieldValue("valid_from");

                  // Check if valid_to is before valid_from
                  if (validFrom && value.isBefore(validFrom)) {
                    return Promise.reject(
                      new Error("Ngày kết thúc phải sau ngày bắt đầu!")
                    );
                  }

                  // Check if date is in the past (but allow same day as today)
                  if (value.isBefore(dayjs(), "day")) {
                    return Promise.reject(
                      new Error("Không thể chọn ngày đã qua!")
                    );
                  }

                  // Check if date is after event end
                  if (
                    eventData &&
                    value.isAfter(dayjs(eventData.end_time), "day")
                  ) {
                    return Promise.reject(
                      new Error(
                        "Ngày kết thúc phải trước khi sự kiện kết thúc!"
                      )
                    );
                  }

                  return Promise.resolve();
                },
              }),
            ]}
            dependencies={["valid_from"]}
          >
            <DatePicker
              id="modal-discount-valid-to"
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: "100%" }}
              disabledDate={(current) => {
                if (!current) return false;

                const validFrom = form.getFieldValue("valid_from");
                if (validFrom && current < validFrom.startOf("day")) {
                  return true;
                }

                // Disable dates after event end
                if (eventData) {
                  const eventEnd = dayjs(eventData.end_time).startOf("day");
                  return current > eventEnd;
                }

                return false;
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DiscountModal;
