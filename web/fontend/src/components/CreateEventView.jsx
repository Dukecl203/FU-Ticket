import React, { useEffect, useState, useRef } from "react";
import {
  Typography,
  Button,
  Form,
  Input,
  DatePicker,
  Select,
  message,
  Upload,
  Spin,
  InputNumber,
  Space,
  Divider,
  Modal,
  Collapse,
  Row,
  Switch,
} from "antd";
import { PlusOutlined, LoadingOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import axios from "axios";
import { Editor } from "@tinymce/tinymce-react";
import LocationSelector from "./Common/LocationSelector";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const CreateEventView = ({ onBack }) => {
  const [form] = Form.useForm();
  const [productForm] = Form.useForm();
  const navigate = useNavigate();

  // Get user from Redux auth state
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id || user?.id;
  const userRole = user?.role;

  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const editorRef = useRef(null);

  // Block access for Admin and Participant
  React.useEffect(() => {
    if (userRole === "Admin" || userRole === "Participant") {
      message.warning("Bạn không có quyền tạo sự kiện!");
      navigate("/organizer", { replace: true });
    }
  }, [userRole, navigate]);

  useEffect(() => {
    // Fetch categories from backend
    axios
      .get("http://localhost:9999/api/binh/categories")
      .then((res) => setCategories(res.data.data || res.data))
      .catch(() => setCategories([]));
  }, []);

  // Early return if user is admin or participant
  if (userRole === "Admin" || userRole === "Participant") {
    return null;
  }

  const openAddProductModal = () => {
    setEditingIndex(null);
    productForm.resetFields();
    productForm.setFieldsValue({ type: "ticket", price: 0, quantity_total: 0 });
    setProductModalVisible(true);
  };

  const openEditProductModal = (index) => {
    const p = products[index];
    setEditingIndex(index);
    productForm.setFieldsValue({
      name: p.name,
      type: p.type || "ticket",
      price: p.price || 0,
      quantity_total: p.quantity_total || 0,
      description: p.description,
      image_url: p.image_url,
    });
    setProductModalVisible(true);
  };

  const removeProduct = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductModalOk = async () => {
    try {
      const values = await productForm.validateFields();
      const normalized = {
        name: values.name,
        type: values.type || "ticket",
        price: Number(values.price) || 0,
        quantity_total: Number(values.quantity_total) || 0,
        description: values.description,
        image_url: values.image_url || "/images/img_default.png",
      };
      setProducts((prev) => {
        if (editingIndex === null || editingIndex === undefined) {
          return [...prev, normalized];
        }
        const clone = [...prev];
        clone[editingIndex] = normalized;
        return clone;
      });
      setProductModalVisible(false);
      setEditingIndex(null);
    } catch {}
  };

  const handleProductModalCancel = () => {
    setProductModalVisible(false);
    setEditingIndex(null);
  };

  const [createdEvent, setCreatedEvent] = useState(null);

  const onFinish = async (values) => {
    try {
      // Validate that at least one ticket product exists
      const ticketProducts = products.filter(
        (p) =>
          p && p.type === "ticket" && p.name && String(p.name).trim().length > 0
      );
      if (ticketProducts.length === 0) {
        message.error("Sự kiện phải có ít nhất 1 sản phẩm loại vé!");
        return;
      }

      // Validate that event dates are not in the past
      const startTime = values.time[0];
      const endTime = values.time[1];

      if (startTime && startTime.isBefore(dayjs(), "day")) {
        message.error("Không thể tạo sự kiện với ngày bắt đầu đã qua!");
        return;
      }

      // Validate that end time is after start time
      if (endTime && endTime.isBefore(startTime)) {
        message.error("Thời gian kết thúc phải sau thời gian bắt đầu!");
        return;
      }

      // Validate that there's at least some duration (e.g., 1 minute)
      if (endTime && endTime.diff(startTime, "minute") < 10) {
        message.error("Sự kiện phải có thời lượng ít nhất 10 phút!");
        return;
      }

      // Get detail value directly from editor instance to ensure it's always a string
      let safeDetail = "";
      try {
        if (editorRef.current) {
          // Get content directly from TinyMCE editor instance
          safeDetail = editorRef.current.getContent() || "";
        } else {
          // Fallback to form value if editor ref is not available
          const detailValue = form.getFieldValue("detail");
          if (typeof detailValue === 'string') {
            safeDetail = detailValue;
          } else if (detailValue) {
            // If it's an object, try to extract meaningful content
            if (detailValue && typeof detailValue === 'object') {
              // Check if it has a content property (TinyMCE editor object)
              if (detailValue.content && typeof detailValue.content === 'string') {
                safeDetail = detailValue.content;
              } else {
                // Try JSON.stringify for debugging, but use empty string to avoid [object Object]
                console.warn("Detail value is an object, using empty string:", detailValue);
                safeDetail = "";
              }
            } else {
              safeDetail = String(detailValue);
            }
          }
        }
      } catch (e) {
        console.error("Error getting detail from editor:", e);
        safeDetail = "";
      }

      // Build payload (ensure all values are serializable)
      // Use toISOString() to ensure UTC dates are sent to backend
      const payload = {
        seller_id: values.seller_id,
        title: values.title,
        description: values.description,
        detail: safeDetail,
        start_time: values.time[0].toISOString(),
        end_time: values.time[1].toISOString(),
        location: values.location,
        category_id: values.category_id,
        status: "draft", // Always draft on create
        poster_url: values.poster_url,
        organizer: {
          name: values.organizer?.name || "",
          email: values.organizer?.email || "",
          phone: values.organizer?.phone || "",
        },
        isFPT: values.isFPT || false,
      };

      const res = await axios.post(
        "http://localhost:9999/api/events/",
        payload
      );
      const eventData = res.data.data || res.data;
      setCreatedEvent(eventData);

      // Create products from local state list
      const productList = Array.isArray(products) ? products : [];
      const toCreate = productList
        .filter((p) => p && p.name && String(p.name).trim().length > 0)
        .map((p) => ({
          event_id: eventData._id || eventData.id,
          name: p.name,
          description: p.description,
          price: Number(p.price) || 0,
          quantity_total: Number(p.quantity_total) || 0,
          type: p.type || "ticket",
        }));

      if (toCreate.length > 0) {
        try {
          await Promise.all(
            toCreate.map((data) =>
              axios.post("http://localhost:9999/api/products", data)
            )
          );
          message.success("Tạo sản phẩm cho sự kiện thành công!");
        } catch (perr) {
          console.error("Error creating products:", perr);
          message.error(
            "Một số sản phẩm không tạo được, nhưng sự kiện đã được tạo."
          );
        }
      }

      message.success("Tạo sự kiện thành công!");

      form.resetFields();
      setProducts([]);
    } catch (err) {
      console.error("Error creating event:", err);
      console.error("Error details:", err.response?.data);

      if (err.response && err.response.data) {
        const errorMsg = err.response.data.message || "";

        // Check for time/location conflict
        if (errorMsg.includes("đã có sự kiện khác vào thời gian này")) {
          message.error(errorMsg, 5); // Show detailed conflict message for 5 seconds
        } else if (err.response.data.errors) {
          message.error(
            "Tạo sự kiện thất bại: " + err.response.data.errors.join(", ")
          );
        } else if (err.response.data.message) {
          message.error("Tạo sự kiện thất bại: " + err.response.data.message);
        } else {
          message.error("Tạo sự kiện thất bại!");
        }
      } else {
        message.error("Tạo sự kiện thất bại!");
      }
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ color: "#000000ff", margin: 0 }}>
          Tạo sự kiện
        </Title>
        <Button onClick={onBack}>Quay lại</Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          time_range: [dayjs(), dayjs().add(2, "hour")],
        }}
      >
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
          <Input id="create-event-title" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea id="create-event-description" rows={3} />
        </Form.Item>

        <Form.Item name="detail" label="Nội dung chi tiết">
          <Editor
            id="create-event-detail"
            apiKey="u94wqr299avhlvzccgxng7dz9bvc9uqfcptg4llgesxtw3vv"
            onInit={(evt, editor) => {
              editorRef.current = editor;
            }}
            value={(() => {
              const detailValue = form.getFieldValue("detail");
              // Ensure value is always a string
              if (detailValue === null || detailValue === undefined) {
                return "";
              }
              if (typeof detailValue === "string") {
                return detailValue;
              }
              // If it's an object, don't use String() as it will create [object Object]
              // Instead, return empty string and log a warning
              if (typeof detailValue === "object") {
                console.warn("Detail value is an object, using empty string:", detailValue);
                return "";
              }
              // For other types, try to convert safely
              try {
                return String(detailValue);
              } catch {
                return "";
              }
            })()}
            init={{
              height: 400,
              menubar: true,
              plugins: [
                "advlist",
                "autolink",
                "lists",
                "link",
                "image",
                "charmap",
                "preview",
                "anchor",
                "searchreplace",
                "visualblocks",
                "code",
                "fullscreen",
                "insertdatetime",
                "media",
                "table",
                "help",
                "wordcount",
              ],
              toolbar:
                "undo redo | blocks | " +
                "bold italic forecolor | alignleft aligncenter " +
                "alignright alignjustify | bullist numlist outdent indent | " +
                "removeformat | link image | code | help",
              images_upload_handler: async (blobInfo, progress) => {
                return new Promise(async (resolve, reject) => {
                  try {
                    const reader = new FileReader();
                    reader.onload = async () => {
                      try {
                        // Convert to base64 data URL
                        const base64 = reader.result;
                        
                        // Upload to Cloudinary via backend API
                        const response = await axios.post(
                          "http://localhost:9999/api/events/upload-editor-image",
                          { image: base64 }
                        );
                        
                        if (response.data.success && response.data.location) {
                          // Return Cloudinary URL
                          resolve(response.data.location);
                        } else {
                          reject("Failed to upload image to Cloudinary");
                        }
                      } catch (error) {
                        console.error("Image upload error:", error);
                        reject("Failed to upload image: " + (error.response?.data?.message || error.message));
                      }
                    };
                    reader.onerror = () => {
                      reject("Failed to convert image to base64");
                    };
                    reader.readAsDataURL(blobInfo.blob());
                  } catch (error) {
                    reject("Failed to process image: " + error.message);
                  }
                });
              },
              content_style:
                "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
              language: "vi",
              branding: false,
              promotion: false,
            }}
            onEditorChange={(content) => {
              // Ensure content is always a string
              const stringContent = typeof content === 'string' ? content : (content ? String(content) : '');
              form.setFieldsValue({ detail: stringContent });
            }}
          />
        </Form.Item>

        <Divider>Thông tin người tổ chức</Divider>

        <Form.Item
          name={["organizer", "name"]}
          label="Tên người tổ chức"
          rules={[
            { required: true, message: "Vui lòng nhập tên người tổ chức" },
          ]}
        >
          <Input
            id="create-event-organizer-name"
            placeholder="Nhập tên người tổ chức"
          />
        </Form.Item>

        <Form.Item
          name={["organizer", "email"]}
          label="Email người tổ chức"
          rules={[
            { required: true, message: "Vui lòng nhập email người tổ chức" },
            { type: "email", message: "Email không hợp lệ" },
          ]}
        >
          <Input
            id="create-event-organizer-email"
            type="email"
            placeholder="Nhập email người tổ chức"
          />
        </Form.Item>

        <Form.Item
          name={["organizer", "phone"]}
          label="Số điện thoại người tổ chức"
          rules={[
            {
              required: true,
              message: "Vui lòng nhập số điện thoại người tổ chức",
            },
          ]}
        >
          <Input
            id="create-event-organizer-phone"
            placeholder="Nhập số điện thoại người tổ chức"
          />
        </Form.Item>

        <Form.Item
          name="isFPT"
          label="Sự kiện FPT"
          tooltip="Nếu bật, sinh viên FPTU sẽ được miễn phí vé cho sự kiện này"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch id="create-event-isfpt" />
        </Form.Item>

        <Form.Item
          name="time"
          label="Thời gian"
          rules={[
            { required: true, message: "Chọn thời gian sự kiện" },
            {
              validator: (_, value) => {
                if (!value || value.length !== 2) {
                  return Promise.resolve();
                }
                const [start, end] = value;
                if (end.isBefore(start)) {
                  return Promise.reject(
                    new Error("Thời gian kết thúc phải sau thời gian bắt đầu!")
                  );
                }
                if (end.diff(start, "minute") < 1) {
                  return Promise.reject(
                    new Error("Sự kiện phải có thời lượng ít nhất 1 phút!")
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <RangePicker
            id="create-event-time"
            showTime
            format="YYYY-MM-DD HH:mm"
            disabledDate={(current) => {
              // Disable dates before today
              return current && current < dayjs().startOf("day");
            }}
          />
        </Form.Item>

        <Form.Item
          name="location"
          label="Địa điểm"
          rules={[{ required: true, message: "Vui lòng chọn địa điểm" }]}
        >
          <LocationSelector
            id="create-event-location"
            placeholder="Chọn địa điểm sự kiện"
          />
        </Form.Item>

        <Form.Item
          name="category_id"
          label="Danh mục"
          rules={[{ required: true }]}
        >
          <Select
            id="create-event-category"
            placeholder="Chọn danh mục"
            loading={categories.length === 0}
          >
            {categories.map((cat) => (
              <Option key={cat._id} value={cat._id}>
                {cat.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="poster_url" label="Poster">
          <Upload
            id="create-event-poster"
            listType="picture-card"
            showUploadList={false}
            beforeUpload={(file) => {
              const isImage = file.type.startsWith("image/");
              if (!isImage) {
                message.error("Chỉ được chọn file ảnh!");
                return false;
              }
              setUploading(true);
              const reader = new FileReader();
              reader.onload = (e) => {
                form.setFieldsValue({ poster_url: e.target.result });
                setUploading(false);
                message.success("Tải ảnh thành công!");
              };
              reader.onerror = () => {
                setUploading(false);
                message.error("Tải ảnh thất bại!");
              };
              try {
                reader.readAsDataURL(file);
              } catch (err) {
                setUploading(false);
                message.error("Lỗi khi đọc file ảnh!");
              }
              return false; // Prevent default upload
            }}
          >
            {uploading ? (
              <div style={{ textAlign: "center" }}>
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
                />
                <div style={{ marginTop: 8 }}>Đang tải ảnh...</div>
              </div>
            ) : form.getFieldValue("poster_url") ? (
              <img
                src={form.getFieldValue("poster_url")}
                alt="poster"
                style={{ width: "100%" }}
              />
            ) : (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        <Divider />
        <Title level={5} style={{ marginTop: 8 }}>
          Sản phẩm (bắt buộc - cần ít nhất 1 vé)
        </Title>
        <Space style={{ marginBottom: 12 }}>
          <Button type="dashed" onClick={openAddProductModal}>
            Thêm sản phẩm
          </Button>
        </Space>
        {products.filter((p) => p && p.type === "ticket").length === 0 && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fff2e8",
              border: "1px solid #ffb366",
              borderRadius: "6px",
              marginBottom: "12px",
              color: "#d46b08",
            }}
          >
            ⚠️ Cần thêm ít nhất 1 sản phẩm loại vé để có thể lưu sự kiện
          </div>
        )}
        <Collapse
          accordion
          items={products.map((p, idx) => ({
            key: idx,
            label: `${p.name || "Sản phẩm"} · ${p.type || "ticket"}`,
            children: (
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="small"
              >
                {p.image_url && (
                  <div>
                    <img
                      src={p.image_url}
                      alt={p.name}
                      style={{
                        width: "150px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #d9d9d9",
                      }}
                    />
                  </div>
                )}
                <div>Giá: {Number(p.price || 0)}</div>
                <div>Số lượng: {Number(p.quantity_total || 0)}</div>
                {p.description ? <div>Mô tả: {p.description}</div> : null}
                <Space>
                  <Button onClick={() => openEditProductModal(idx)}>
                    Chỉnh sửa
                  </Button>
                  <Button danger onClick={() => removeProduct(idx)}>
                    Xoá
                  </Button>
                </Space>
              </Space>
            ),
          }))}
        />

        {/* Hidden: seller_id, often auto from logged-in user */}
        <Form.Item name="seller_id" initialValue={userId} hidden>
          <Input type="hidden" />
        </Form.Item>

        <Form.Item style={{ marginTop: 8 }}>
          <Button type="primary" htmlType="submit">
            Lưu sự kiện
          </Button>
          <Button onClick={onBack} style={{ marginLeft: 8 }}>
            Quay lại
          </Button>
        </Form.Item>
      </Form>

      <Modal
        title={
          editingIndex !== null
            ? "Chỉnh sửa sản phẩm"
            : "Thêm sản phẩm (cần ít nhất 1 vé)"
        }
        open={productModalVisible}
        onOk={handleProductModalOk}
        onCancel={handleProductModalCancel}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={productForm} layout="vertical">
          <Form.Item
            name="name"
            label="Tên sản phẩm"
            rules={[{ required: true, message: "Nhập tên sản phẩm" }]}
          >
            <Input id="create-product-name" placeholder="VD: Standard Ticket" />
          </Form.Item>
          <Form.Item name="type" label="Loại" initialValue="ticket">
            <Select id="create-product-type" placeholder="Chọn loại" allowClear>
              <Option value="ticket">Vé (ticket) - Khuyến nghị</Option>
              <Option value="merchandise">Hàng hoá</Option>
            </Select>
          </Form.Item>
          <Form.Item name="price" label="Giá" initialValue={0}>
            <InputNumber
              id="create-product-price"
              min={0}
              style={{ width: "100%" }}
              placeholder="0"
            />
          </Form.Item>
          <Form.Item name="quantity_total" label="Số lượng" initialValue={0}>
            <InputNumber
              id="create-product-quantity"
              min={0}
              style={{ width: "100%" }}
              placeholder="0"
            />
          </Form.Item>
          <Form.Item name="description" label="Mô tả sản phẩm">
            <Input.TextArea id="create-product-description" rows={2} />
          </Form.Item>

          <Form.Item name="image_url" label="Hình ảnh (tùy chọn)">
            <Upload
              id="create-product-image"
              listType="picture-card"
              showUploadList={false}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith("image/");
                if (!isImage) {
                  message.error("Chỉ được chọn file ảnh!");
                  return false;
                }
                setProductImageUploading(true);
                const reader = new FileReader();
                reader.onload = (e) => {
                  productForm.setFieldsValue({ image_url: e.target.result });
                  setProductImageUploading(false);
                  message.success("Tải ảnh thành công!");
                };
                reader.onerror = () => {
                  setProductImageUploading(false);
                  message.error("Tải ảnh thất bại!");
                };
                try {
                  reader.readAsDataURL(file);
                } catch (err) {
                  setProductImageUploading(false);
                  message.error("Lỗi khi đọc file ảnh!");
                }
                return false; // Prevent default upload
              }}
            >
              {productImageUploading ? (
                <div style={{ textAlign: "center" }}>
                  <Spin
                    indicator={
                      <LoadingOutlined style={{ fontSize: 24 }} spin />
                    }
                  />
                  <div style={{ marginTop: 8 }}>Đang tải ảnh...</div>
                </div>
              ) : productForm.getFieldValue("image_url") ? (
                <img
                  src={productForm.getFieldValue("image_url")}
                  alt="product"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CreateEventView;
