import { useEffect, useState } from "react";
import "./Header.css";
import { getWithExpiry } from "../../detailEvent/utils/storage.js";
import { useNavigate } from "react-router-dom";

function Header() {
  const [eventData, setEventData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const navigate = useNavigate();

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

useEffect(() => {
  const stored = JSON.parse(localStorage.getItem("cart"));

  const value = getWithExpiry("cart");
  if (!value) {
    navigate("/");
    return;         
  }

  setEventData(value.event);

  // lấy expiry gốc
  const rawItem = JSON.parse(localStorage.getItem("cart"));
  const now = Date.now();
  const remaining = Math.floor((rawItem.expiry - now) / 1000);
  setTimeLeft(remaining > 0 ? remaining : 0);
}, [navigate]);

useEffect(() => {
  if (timeLeft > 0) {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("Hết thời gian giữ vé. Bạn sẽ được chuyển về trang chủ.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }
}, [timeLeft, navigate]);

  return (
    <header className="bp-header">
      <div className="bp-header-content">
        <button className="bp-back-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="bp-steps">
          <div className="bp-step active">
            <span className="bp-step-number">1</span>
            <span className="bp-step-label">Chọn vé</span>
          </div>
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="bp-step-arrow">
            <path d="M1 1L6 6L1 11" stroke="#666" strokeWidth="1.5" />
          </svg>
          <div className="bp-step">
            <span className="bp-step-number">2</span>
            <span className="bp-step-label">Nhập thông tin</span>
          </div>
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="bp-step-arrow">
            <path d="M1 1L6 6L1 11" stroke="#666" strokeWidth="1.5" />
          </svg>
          <div className="bp-step">
            <span className="bp-step-number">3</span>
            <span className="bp-step-label">Thanh toán</span>
          </div>
        </div>

        <div className="bp-timer">
          <span className="bp-timer-label">Thời gian đặt vé còn lại</span>
          <span className="bp-timer-value">{timeLeft > 0 ? formatTime(timeLeft) : "00:00"}</span>
        </div>
      </div>

      {eventData && (
        <div className="bp-event-info-bar">
          <div className="bp-event-info">
            <span className="bp-event-title">{eventData.title}</span>
            <div className="bp-event-details">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect
                  x="2"
                  y="3"
                  width="12"
                  height="11"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M5 1V4M11 1V4M2 6H14" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>{eventData.date} - {eventData.time}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M8 4V8L11 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>{eventData.location}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
