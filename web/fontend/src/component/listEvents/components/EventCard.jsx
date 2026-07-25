import React, { useState, useEffect } from "react";
import "./EventCard.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ReviewPopup from "./ReviewPopup";

function EventCard({ event }) {
  const navigate = useNavigate();
  const [avgRating, setAvgRating] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  // 📊 Lấy rating trung bình
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get(
          `http://localhost:9999/api/review/${event.id}`
        );
        setAvgRating(res.data.averageRating || 0);
      } catch (err) {
        console.error("Lỗi khi tải review:", err);
      }
    };
    fetchReviews();
  }, [event.id]);

  const handleReviewSubmit = async () => {
    // Sau khi người dùng gửi review, reload rating
    try {
      const res = await axios.get(
        `http://localhost:9999/api/review/${event.id}`
      );
      setAvgRating(res.data.averageRating || 0);
    } catch (err) {
      console.error("Không thể tải lại rating:", err);
    }
  };

const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  if (isNaN(date)) return "N/A";

  return date.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

  const getEventStatus = (startDate, endDate) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (today < start) return "Sắp tới";
    if (today > end) return "Đã qua";
    return "Đang diễn ra";
  };

  // 🧠 Lấy userId từ local (đã đăng nhập)
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const userId = storedUser?.id;

  return (
    <div className="event-card">
      <div className="event-card__image">
        <img src={event.image} alt={event.title} />
        <div className="event-card__price">
          {event.price === 0
            ? "Miễn phí"
            : `${event.price.toLocaleString("vi-VN")} ₫`}
        </div>
        <div className="event-status">
          {getEventStatus(event.start_time, event.end_time)}
        </div>
      </div>

      <div className="event-card__details">
        <div className="event-card__details-content">
          <h3>{event.title}</h3>
          <p>{event.artist}</p>
          <div className="event-card__row">
            <span>
              📅 {formatDate(event.start_time)} • {formatDate(event.end_time)}
            </span>
          </div>
          <div className="event-card__row">
            <span>📍 {event.location}</span>
          </div>
          <div className="event-card__attendees">
            <span>👥 {event.attendees.toLocaleString()} quan tâm</span>
            <span className="rating">⭐ {avgRating}</span>
          </div>
        </div>

        <div className="event-card__actions">
          <button
            className="btn primary"
            onClick={() => navigate(`/event/${event.id}`)}
          >
            Xem chi tiết
          </button>
          <button className="btn" onClick={() => setShowPopup(true)}>
            ⭐ Đánh giá
          </button>
        </div>
      </div>

      {showPopup && (
        <ReviewPopup
          eventId={event.id}
          userId={userId}
          onClose={() => setShowPopup(false)}
          onReviewSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
}

export default EventCard;
