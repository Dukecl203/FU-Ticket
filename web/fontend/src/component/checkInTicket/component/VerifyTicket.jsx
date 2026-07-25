import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function VerifyTicket({ ticketNumber, onReset }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const { eventId } = useParams(); // 🆕 Lấy eventId từ URL

  useEffect(() => {
    if (ticketNumber) verifyTicket();
  }, [ticketNumber]);

  const extractItemId = () => {
    const match = ticketNumber.match(/Item=([^&]+)/);
    return match ? match[1] : null;
  };

  const verifyTicket = async () => {
    setLoading(true);
    setError("");

    const itemId = extractItemId();
    if (!itemId) {
      setError("Mã vé không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(
        `http://localhost:9999/api/order/item/detail/${itemId}`
      );

      if (!res.data?.success || !res.data?.data) {
        setError("Không tìm thấy vé hoặc vé không hợp lệ.");
      } else {
        const data = res.data.data;

        // 🧩 Kiểm tra vé có thuộc đúng sự kiện không
        if (eventId && data.product?.event?.id !== eventId) {
          setError("⚠️ Vé không thuộc sự kiện này!");
          setTicket(null);
          return;
        }

        setTicket(data);
      }
    } catch (err) {
      console.error("Lỗi xác minh vé:", err);
      setError("Không thể xác minh vé. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!ticket || ticket.status === "Scanned") return;

    setChecking(true);
    try {
      // ✅ Cập nhật bằng ID của order item, không phải product
      const res = await axios.put(
        `http://localhost:9999/api/order/item/detail/${ticket._id}`,
        { status: "Scanned" }
      );

      if (res.data?.success) {
        const toast = document.createElement("div");
        toast.textContent = "✅ Vé đã được quét thành công!";
        toast.style.position = "fixed";
        toast.style.bottom = "20px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";
        toast.style.background = "#4caf50";
        toast.style.color = "white";
        toast.style.padding = "12px 20px";
        toast.style.borderRadius = "8px";
        toast.style.fontWeight = "500";
        toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        toast.style.zIndex = "9999";
        document.body.appendChild(toast);

        setTimeout(() => {
          toast.remove();
          window.location.reload();
        }, 2000);
      } else {
        setError("Không thể cập nhật trạng thái vé.");
      }
    } catch (err) {
      setError("Lỗi khi xác nhận Check-in.");
    } finally {
      setChecking(false);
    }
  };

  // --- Giao diện hiển thị ---
  if (loading)
    return (
      <div className="verify-container">
        <div className="verify-header">
          <h2>⏳ Đang xác minh vé...</h2>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="verify-container verify-invalid">
        <div className="verify-header">
          <h2>❌ Vé không hợp lệ</h2>
          <p>{error}</p>
        </div>
        <div
          style={{ textAlign: "center", color: "#555", marginBottom: "2rem" }}
        >
          Vui lòng kiểm tra lại mã QR hoặc nhập tay để xác thực.
        </div>
        <div className="verify-actions">
          <button onClick={onReset} className="verify-btn verify-btn-secondary">
            Quét lại
          </button>
        </div>
      </div>
    );

  if (ticket) {
    const { _id, order, product, status } = ticket;
    const isScanned = status === "Scanned";

    return (
      <div
        className={`verify-container ${
          isScanned ? "verify-used" : "verify-valid"
        }`}
      >
        <div className="verify-header">
          {isScanned ? (
            <>
              <h2>⚠️ Vé đã được check-in</h2>
              <p>Vé này đã được quét trước đó.</p>
              <tr>
                <td>🕒 Lần quét cuối:</td>
                <td>{new Date(ticket.updatedAt).toLocaleString("vi-VN")}</td>
              </tr>
            </>
          ) : (
            <>
              <h2>✅ Vé hợp lệ</h2>
              <p>Vé sẵn sàng để check-in.</p>
            </>
          )}
        </div>

        <table className="verify-table">
          <tbody>
            <tr>
              <td>🎫 Mã đơn:</td>
              <td>{_id}</td>
            </tr>
            <tr>
              <td>🎫 Mã đơn:</td>
              <td>{order?.order_code}</td>
            </tr>
            <tr>
              <td>🎉 Sự kiện:</td>
              <td>{product?.event?.title}</td>
            </tr>
            <tr>
              <td>📍 Địa điểm:</td>
              <td>{product?.event?.location}</td>
            </tr>
          </tbody>
        </table>

        <div className="verify-actions">
          {!isScanned && (
            <button
              onClick={handleCheckIn}
              disabled={checking}
              className="verify-btn verify-btn-primary"
            >
              {checking ? "Đang xác nhận..." : "Xác nhận Check-in"}
            </button>
          )}
          <button onClick={onReset} className="verify-btn verify-btn-secondary">
            Quét vé khác
          </button>
        </div>
      </div>
    );
  }

  return null;
}
