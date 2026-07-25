import React, { useState } from "react";
import axios from "axios";
import "./ReviewPopup.css";
import { containsBadWords } from "../../utils/filter";

function ReviewPopup({ eventId, userId, onClose, onReviewSubmit }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rating)
      return alert("Vui lòng chọn số sao trước khi gửi!");

    // ⚠️ Kiểm duyệt comment
    if (containsBadWords(comment)) {
      alert("Nội dung đánh giá chứa từ ngữ không phù hợp. Vui lòng sửa lại.");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`http://localhost:9999/api/review/${eventId}`, {
        user_id: userId,
        event_id: eventId,
        rating,
        comments: comment.trim(),
      });

      onReviewSubmit?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Gửi đánh giá thất bại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pu-review-popup" onClick={onClose}>
      <div className="pu-review-popup__content" onClick={(e) => e.stopPropagation()}>
        <h2>Đánh giá sự kiện</h2>

        <div className="pu-rating-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`pu-star ${star <= (hover || rating) ? "active" : ""}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
            >
              ★
            </span>
          ))}
        </div>

        <textarea
          className="pu-textarea"
          placeholder="Chia sẻ cảm nhận của bạn..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="pu-review-popup__actions">
          <button
            className="pu-btn primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Đang gửi..." : "Gửi"}
          </button>
          <button className="pu-btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewPopup;
