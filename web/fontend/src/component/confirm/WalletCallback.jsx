import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import qs from "query-string";
import Header from "../heroComponent/Header";
import Footer from "../heroComponent/Footer";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

function WalletCallback() {
  const navigate = useNavigate();
  const hasRun = useRef(false);

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("Đang xử lý giao dịch...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const processTopup = async () => {
      try {
        const query = window.location.search.substring(1);
        const parsed = qs.parse(query);

        setStatus("loading");
        setMessage("🔄 Đang xác nhận giao dịch nạp tiền...");

        // 🎯 Gọi API callback nạp tiền
        const res = await axios.post(
          "http://localhost:9999/api/payment/momo/topup-callback",
          parsed
        );
        if (res.data.message !== "Topup success") {
          setStatus("error");
          setMessage("❌ Nạp tiền thất bại! Vui lòng thử lại.");
          setLoading(false);
          return;
        }

        // Thành công
        setStatus("success");
        setMessage(`🎉 Nạp tiền thành công! Số dư ví đã được cập nhật.`);

        // 3 giây sau quay về trang ví
        setTimeout(() => navigate("/profile"), 3000);
      } catch (err) {
        console.error("❌ Lỗi callback:", err);
        setStatus("error");
        setMessage("⚠️ Đã xảy ra lỗi trong quá trình xử lý giao dịch.");
      } finally {
        setLoading(false);
      }
    };

    processTopup();
  }, [navigate]);

  // 🎨 Style trạng thái
  const getStatusStyle = () => {
    switch (status) {
      case "loading":
        return { color: "#ff9800" };
      case "success":
        return { color: "#4caf50" };
      case "error":
        return { color: "#f44336" };
      default:
        return {};
    }
  };

  // 🎨 Icon trạng thái
  const renderIcon = () => {
    switch (status) {
      case "loading":
        return (
          <LoadingOutlined spin style={{ fontSize: 48, color: "#ff9800" }} />
        );
      case "success":
        return (
          <CheckCircleOutlined style={{ fontSize: 48, color: "#4caf50" }} />
        );
      case "error":
        return (
          <CloseCircleOutlined style={{ fontSize: 48, color: "#f44336" }} />
        );
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
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          fontSize: "20px",
        }}
      >
        {renderIcon()}
        <p style={{ ...getStatusStyle(), fontWeight: 600 }}>{message}</p>

        {status === "success" && (
          <p style={{ fontSize: "16px", color: "#666" }}>
            Bạn sẽ được chuyển về trang ví sau ít giây...
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default WalletCallback;
