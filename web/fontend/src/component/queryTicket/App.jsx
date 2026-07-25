import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../heroComponent/Header.jsx";
import Footer from "../heroComponent/Footer.jsx";
import { getWithExpiry } from "../detailEvent/utils/storage.js";
import "./QueryTicket.css";

function App() {
  const [timeRemaining, setTimeRemaining] = useState(10); // đếm ngược 10s
  const [cart, setCart] = useState(null);
  const navigate = useNavigate();

  // Lấy dữ liệu từ localStorage
  useEffect(() => {
    const cartData = getWithExpiry("cart");
    if (cartData) {
      setCart(cartData);
    } else {
      // Không có giỏ hàng -> quay lại trang sự kiện
      navigate("/");
    }
  }, [navigate]);

  // Đếm ngược
  useEffect(() => {
    if (timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  // 👉 Tự động chuyển sau khi hết giờ
  useEffect(() => {
    if (timeRemaining === 0) {
      navigate("/checkout");
    }
  }, [timeRemaining, navigate]);

  if (!cart) return null;

  const { event } = cart;

  return (
    <div>
      <Header />
      <div className="qr-app">
        <div className="qr-background-overlay"></div>

        <div className="qr-container">
          <div className="qr-card">
            <div className="qr-banner-section">
              <img
                src={event.image}
                alt={event.title}
                className="qr-banner-image"
              />
              <div className="qr-event-logo">
                <div className="qr-logo-placeholder">
                  {event.title.substring(0, 3).toUpperCase()}
                </div>
              </div>
              <div className="qr-event-date">
                {event.date} - {event.location}
              </div>
              <div className="qr-decorative-flowers qr-flower-left">✿</div>
              <div className="qr-decorative-flowers qr-flower-right">✿ ✿</div>
            </div>

            <div className="qr-content-section">
              <p className="qr-subtitle">
                Cảm ơn bạn đã tham gia phòng chờ cho sự kiện
              </p>
              <h1 className="qr-title">{event.title}</h1>

              <div className="qr-info-box">
                <p className="qr-info-text">
                  Tìm thấy lượt mua sản phẩm chưa hoàn thành. Bạn có muốn tiếp tục
                  lượt mua sản phẩm đó?
                </p>
                <p className="qr-notice-text">
                  <strong>Lưu ý:</strong> Nếu bạn chọn xếp hàng mua lại, bạn sẽ
                  xếp hàng lại từ đầu
                </p>
              </div>

              <div className="qr-countdown-section">
                <p className="qr-countdown-label">
                  Tự động chuyển đến trang mua sản phẩm sau{" "}
                  <strong>{timeRemaining} giây</strong>
                </p>
              </div>

              <div className="qr-button-group">
                <button
                  className="qr-btn qr-btn-secondary"
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  Xếp hàng mua lại
                </button>
                <button
                  className="qr-btn qr-btn-primary"
                  onClick={() => navigate("/checkout")}
                >
                  Tiếp tục mua sản phẩm
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
