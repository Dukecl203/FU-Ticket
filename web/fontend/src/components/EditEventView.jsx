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
  Space,
  InputNumber,
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

const EditEventView = ({ eventId, onBack }) => {
  const [form] = Form.useForm();
  const [productForm] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const editorRef = useRef(null);

  // Get user from Redux auth state
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role;

  // Block access for Admin and Participant
  React.useEffect(() => {
    if (userRole === "Admin" || userRole === "Participant") {
      message.warning("Bạn không có quyền chỉnh sửa sự kiện!");
      navigate("/organizer", { replace: true });
    }
  }, [userRole, navigate]);

  // Early return if user is admin or participant
  if (userRole === "Admin" || userRole === "Participant") {
    return null;
  }

  useEffect(() => {
    // Fetch event and categories
    Promise.all([
      axios.get(`http://localhost:9999/api/events/${eventId}`),
      axios.get("http://localhost:9999/api/binh/categories"),
    ])
      .then(([eventRes, categoriesRes]) => {
        const eventData = eventRes.data.data || eventRes.data;
        setEvent(eventData);
        setCategories(categoriesRes.data.data || categoriesRes.data);
        setLoading(false);
        // Set initial form values
        // Ensure detail is always a string
        let safeDetail = "";
        if (eventData.detail) {
          if (typeof eventData.detail === "string") {
            safeDetail = eventData.detail;
          } else {
            try {
              safeDetail = String(eventData.detail);
            } catch (e) {
              console.warn("Could not convert detail to string:", e);
              safeDetail = "";
            }
          }
        }
        form.setFieldsValue({
          title: eventData.title,
          description: eventData.description,
          detail: safeDetail,
          time: [dayjs(eventData.start_time), dayjs(eventData.end_time)],
          location: eventData.location,
          category_id: eventData.category_id?._id || eventData.category_id,
          poster_url: eventData.poster_url,
          seller_id: eventData.seller_id?._id || eventData.seller_id,
          organizer: {
            name: eventData.organizer?.name || "",
            email: eventData.organizer?.email || "",
            phone: eventData.organizer?.phone || "",
          },
          isFPT: eventData.isFPT || false,
        });
        // Fetch products for this event
        fetchProducts();
      })
      .catch(() => {
        message.error("Không thể tải dữ liệu!");
        setLoading(false);
      });
  }, [eventId, form]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await axios.get(
        `http://localhost:9999/api/products/event/${eventId}`
      );
      const productsData = res.data.data || res.data || [];
      setProducts(productsData);
    } catch (e) {
      console.error("Error fetching products:", e);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const openAddProductModal = () => {
    setEditingProductId(null);
    productForm.resetFields();
    productForm.setFieldsValue({ type: "ticket", price: 0, quantity_total: 0 });
    setProductModalVisible(true);
  };

  const openEditProductModal = (product) => {
    setEditingProductId(product._id);
    productForm.setFieldsValue({
      name: product.name,
      type: product.type || "ticket",
      price: product.price || 0,
      quantity_total: product.quantity_total || 0,
      description: product.description,
      image_url: product.image_url,
    });
    setProductModalVisible(true);
  };

  const handleProductModalOk = async () => {
    try {
      const values = await productForm.validateFields();
      const normalized = {
        name: values.name,
        description: values.description,
        price: Number(values.price) || 0,
        image_url: values.image_url || "/images/img_default.png",
        quantity_total: Number(values.quantity_total) || 0,
        type: values.type || "ticket",
        event_id: eventId,
      };
      if (editingProductId) {
        await axios.put(
          `http://localhost:9999/api/products/${editingProductId}`,
          normalized
        );
        message.success("Cập nhật sản phẩm thành công!");
      } else {
        await axios.post("http://localhost:9999/api/products", normalized);
        message.success("Thêm sản phẩm thành công!");
      }
      setProductModalVisible(false);
      setEditingProductId(null);
      fetchProducts();
    } catch (e) {
      console.error("Error in handleProductModalOk:", e);
      if (e.response && e.response.data) {
        message.error("Lỗi: " + (e.response.data.message || e.response.data));
      } else {
        message.error("Có lỗi xảy ra khi lưu sản phẩm!");
      }
    }
  };

  const handleProductModalCancel = () => {
    setProductModalVisible(false);
    setEditingProductId(null);
  };

  const handleDeleteProduct = async (id) => {
    try {
      await axios.delete(`http://localhost:9999/api/products/${id}`);
      message.success("Xóa sản phẩm thành công!");
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (e) {
      console.error("Error deleting product:", e);
      if (e.response && e.response.data) {
        message.error("Lỗi: " + (e.response.data.message || e.response.data));
      } else {
        message.error("Xóa sản phẩm thất bại!");
      }
    }
  };

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
        message.error("Không thể chỉnh sửa sự kiện với ngày bắt đầu đã qua!");
        return;
      }

      // Validate that end time is after start time
      if (endTime && endTime.isBefore(startTime)) {
        message.error("Thời gian kết thúc phải sau thời gian bắt đầu!");
        return;
      }

      // Validate that there's at least some duration (e.g., 1 minute)
      if (endTime && endTime.diff(startTime, "minute") < 1) {
        message.error("Sự kiện phải có thời lượng ít nhất 1 phút!");
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
          const detailValue = values.detail || form.getFieldValue("detail");
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

      // Build payload (same structure as CreateEventView)
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
        status: event?.status === "draft" ? "draft" : "pending",
        poster_url: values.poster_url,
        organizer: {
          name: values.organizer?.name || "",
          email: values.organizer?.email || "",
          phone: values.organizer?.phone || "",
        },
        isFPT: values.isFPT || false,
      };

      await axios.put(`http://localhost:9999/api/events/${eventId}`, payload);

      // Save any unsaved products in the product modal (same as CreateEventView)
      if (productModalVisible && productForm) {
        try {
          const productValues = productForm.getFieldsValue();
          if (productValues.name && productValues.name.trim()) {
            const normalizedProduct = {
              name: productValues.name,
              description: productValues.description,
              price: Number(productValues.price) || 0,
              quantity_total: Number(productValues.quantity_total) || 0,
              type: productValues.type || "ticket",
              event_id: eventId,
            };

            if (editingProductId) {
              await axios.put(
                `http://localhost:9999/api/products/${editingProductId}`,
                normalizedProduct
              );
            } else {
              await axios.post(
                "http://localhost:9999/api/products",
                normalizedProduct
              );
            }

            // Close modal and reset state after successful save (same as CreateEventView)
            setProductModalVisible(false);
            setEditingProductId(null);
          }
        } catch (productError) {
          console.error("Error saving product from modal:", productError);
          // Don't fail the main request if product save fails
        }
      }

      if (event?.status === "draft") {
        message.success(
          "Cập nhật thành công! Sự kiện vẫn ở trạng thái bản nháp."
        );
      } else {
        message.success(
          "Cập nhật thành công! Sự kiện đã được gửi yêu cầu phê duyệt."
        );
      }

      onBack();
    } catch (err) {
      console.error("Error updating event:", err);
      console.error("Error details:", err.response?.data);

      if (err.response && err.response.data) {
        const errorMsg = err.response.data.message || "";

        // Check for time/location conflict
        if (errorMsg.includes("đã có sự kiện khác vào thời gian này")) {
          message.error(errorMsg, 5); // Show for 5 seconds
        } else if (err.response.data.errors) {
          message.error(
            "Cập nhật thất bại: " + err.response.data.errors.join(", ")
          );
        } else if (err.response.data.message) {
          message.error("Cập nhật thất bại: " + err.response.data.message);
        } else {
          message.error("Cập nhật thất bại!");
        }
      } else {
        message.error("Cập nhật thất bại!");
      }
    }
  };

  if (loading) return <Spin />;

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
          Chỉnh sửa sự kiện
        </Title>
        <Button onClick={onBack}>Quay lại</Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          time: event
            ? [dayjs(event.start_time), dayjs(event.end_time)]
            : [dayjs(), dayjs().add(2, "hour")],
        }}
      >
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
          <Input id="event-title" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea id="event-description" rows={3} />
        </Form.Item>

        <Form.Item name="detail" label="Nội dung chi tiết">
          <Editor
            id="event-detail"
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
            id="event-organizer-name"
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
            id="event-organizer-email"
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
            id="event-organizer-phone"
            placeholder="Nhập số điện thoại người tổ chức"
          />
        </Form.Item>

        <Form.Item
          name="isFPT"
          label="Sự kiện FPT"
          tooltip="Nếu bật, sinh viên FPTU sẽ được miễn phí vé cho sự kiện này"
          valuePropName="checked"
        >
          <Switch id="event-isfpt" />
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
            id="event-time"
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
            id="event-location"
            placeholder="Chọn địa điểm sự kiện"
          />
        </Form.Item>

        <Form.Item
          name="category_id"
          label="Danh mục"
          rules={[{ required: true }]}
        >
          <Select
            id="event-category"
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
            id="event-poster"
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
        <Title level={5} style={{ marginBottom: 8 }}>
          Sản phẩm của sự kiện (bắt buộc - cần ít nhất 1 vé)
        </Title>
        <Space style={{ marginBottom: 12 }}>
          <Button type="dashed" onClick={openAddProductModal}>
            Thêm sản phẩm
          </Button>
        </Space>
        {loadingProducts ? (
          <Spin />
        ) : (
          <>
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
            <Collapse accordion>
              {products.map((p) => (
                <Collapse.Panel
                  header={`${p.name || "Sản phẩm"} · ${p.type || "ticket"}`}
                  key={p._id}
                >
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
                      <Button onClick={() => openEditProductModal(p)}>
                        Chỉnh sửa
                      </Button>
                      <Button danger onClick={() => handleDeleteProduct(p._id)}>
                        Xoá
                      </Button>
                    </Space>
                  </Space>
                </Collapse.Panel>
              ))}
            </Collapse>
          </>
        )}

        {/* Hidden: seller_id, often auto from logged-in user */}
        <Form.Item name="seller_id" initialValue={event?.seller_id} hidden>
          <Input type="hidden" />
        </Form.Item>
        <Row style={{ marginTop: 8 }}>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {event?.status === "draft"
                ? "Lưu bản nháp"
                : "Lưu và gửi yêu cầu phê duyệt"}
            </Button>
            <Button onClick={onBack} style={{ marginLeft: 8 }}>
              Quay lại
            </Button>
          </Form.Item>
        </Row>
      </Form>

      <Modal
        title={
          editingProductId
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
            <Input id="product-name" placeholder="VD: Standard Ticket" />
          </Form.Item>
          <Form.Item name="type" label="Loại" initialValue="ticket">
            <Select id="product-type" placeholder="Chọn loại" allowClear>
              <Option value="ticket">Vé (ticket) - Khuyến nghị</Option>
              <Option value="merchandise">Hàng hoá</Option>
            </Select>
          </Form.Item>
          <Form.Item name="price" label="Giá" initialValue={0}>
            <InputNumber
              id="product-price"
              min={0}
              style={{ width: "100%" }}
              placeholder="0"
            />
          </Form.Item>
          <Form.Item name="quantity_total" label="Số lượng" initialValue={0}>
            <InputNumber
              id="product-quantity"
              min={0}
              style={{ width: "100%" }}
              placeholder="0"
            />
          </Form.Item>
          <Form.Item name="description" label="Mô tả sản phẩm">
            <Input.TextArea id="product-description" rows={2} />
          </Form.Item>

          <Form.Item name="image_url" label="Hình ảnh (tùy chọn)">
            <Upload
              id="product-image"
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

export default EditEventView;
