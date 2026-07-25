import { useEffect, useState,useRef  } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import qs from "query-string";
import emailjs from "emailjs-com";
import Footer from "../heroComponent/Footer";
import Header from "../heroComponent/Header";
import { Spin } from "antd"; // thêm loader từ antd
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from "@ant-design/icons";

function Firm() {
const navigate = useNavigate();
  const hasRun = useRef(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("loading"); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState("Đang xác nhận thanh toán...");

useEffect(() => {
  if (hasRun.current) return;
  hasRun.current = true;

  const sendEmail = async () => {
    try {
      const query = qs.parse(window.location.search.substring(1));
      const orderId = query.orderId;
      if (!orderId) throw new Error("Không tìm thấy orderId");

      const sentKey = `email_sent_${orderId}`;
      if (localStorage.getItem(sentKey)) {
        setMessage("✅ Email đã gửi trước đó.");
        setStatus("success");
        setLoading(false);
        setTimeout(() => navigate("/"), 4000);
        return;
      }

      setMessage("✅ Thanh toán thành công, đang gửi email xác nhận...");
      setStatus("loading");

      // Lấy dữ liệu order + user + products từ API nếu cần
      const detailRes = await axios.get(`http://localhost:9999/api/orders/${orderId}/details`);
      const { order, user, products } = detailRes.data;

      const itemsHtml = products
        .map(
          (item) => `<tr><td>${item.name} × ${item.quantity}</td><td style="text-align:right">${item.price.toLocaleString("vi-VN")} đ</td></tr>`
        )
        .join("");

      const emailData = {
        id: orderId,
        email: user.email,
        event_name: products[0]?.event?.title || "Sự kiện của bạn",
        event_time: `${new Date(products[0]?.event?.start_time).toLocaleString("vi-VN")} - ${new Date(products[0]?.event?.end_time).toLocaleString("vi-VN")}`,
        event_location: products[0]?.event?.location || "Chưa cập nhật",
        ticket_link: `http://localhost:5173/profile/tickets/detail/${orderId}`,
        order_id: order.order_id,
        customer_name: user.name,
        customer_email: user.email,
        customer_phone: user.phone,
        payment_method: order.payment_method,
        order_date: new Date(order.created_at).toLocaleString("vi-VN"),
        total_price: order.total_amount.toLocaleString("vi-VN"),
        items_html: itemsHtml,
      };

      await emailjs.send("service_vzz4ba6", "template_9he2vdi", emailData, "N0sX7Ju3vZUPP9iX2");

      localStorage.setItem(sentKey, "true");

      setMessage(`🎉 Email xác nhận đã được gửi đến ${user.email}`);
      setStatus("success");

      setTimeout(() => navigate("/"), 5000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi gửi email xác nhận.");
      setStatus("error");
      setLoading(false);
    }
  };

  sendEmail();
}, [navigate]);



  // 🎨 Style cho từng trạng thái
  const getStatusStyle = () => {
    switch (status) {
      case "loading":
        return { color: "#ff9800" }; // cam
      case "success":
        return { color: "#4caf50" }; // xanh lá
      case "error":
        return { color: "#f44336" }; // đỏ
      default:
        return { color: "#333" };
    }
  };

  const renderIcon = () => {
    switch (status) {
      case "loading":
        return <LoadingOutlined spin style={{ fontSize: 48, color: "#ff9800" }} />;
      case "success":
        return <CheckCircleOutlined style={{ fontSize: 48, color: "#4caf50" }} />;
      case "error":
        return <CloseCircleOutlined style={{ fontSize: 48, color: "#f44336" }} />;
      default:
        return null;
    }
  };

  return (
    <div className="bp-app">
      <Header />
      <div
        style={{
          textAlign: "center",
          padding: "80px 20px",
          fontSize: "20px",
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
        }}
      >
        {renderIcon()}
        <p style={{ ...getStatusStyle(), fontWeight: 600 }}>{message}</p>
        {status === "success" && (
          <p style={{ fontSize: "16px", color: "#666" }}>
            Bạn sẽ được chuyển về trang chủ sau ít giây...
          </p>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default Firm;
