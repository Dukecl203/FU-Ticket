import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import "./ReviewSection.css";
import { useStore } from "../../../hooks/useStore.jsx";
import { useNavigate } from "react-router-dom";
import { containsBadWords } from "../../utils/filter.js";

function ReviewSection({ eventId, reviews, setReviews }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const store = useStore();
  const user = store?.dataUser || {};
  const userId = user?.id || null;
  const navigate = useNavigate();

  //  Lấy danh sách review khi load trang hoặc khi eventId thay đổi
  useEffect(() => {
    const fetchReviews = async () => {
      if (!eventId) return;
      try {
        const res = await axios.get(
          `http://localhost:9999/api/review/${eventId}`
        );
        setReviews(res.data.reviews || []);
      } catch (err) {
        console.error("Lỗi khi tải review:", err);
      }
    };
    fetchReviews();
  }, [eventId, setReviews]);

  //  Gửi review mới
  const handleSubmit = async (e) => {
    e.preventDefault();

    //  Nếu chưa đăng nhập → chuyển hướng đến trang đăng nhập
    if (!userId) {
      alert("Vui lòng đăng nhập để gửi đánh giá!");
      navigate("/signin");
      return;
    }
    if (!rating) {
      alert("Vui lòng chọn số sao!");
      return;
    }
    if (containsBadWords(comment)) {
      alert("Nội dung đánh giá chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa.");
      return;
    }
    try {
      await axios.post(`http://localhost:9999/api/review/${eventId}`, {
        user_id: userId,
        event_id: eventId,
        rating,
        comments: comment,
      });

      setComment("");
      setRating(0);

      // ✅ cập nhật lại danh sách review
      const res = await axios.get(
        `http://localhost:9999/api/review/${eventId}`
      );
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error(err);
      alert("Gửi đánh giá thất bại!");
    }
  };

  // ✅ Lọc và sắp xếp review: review của tôi lên đầu
  const sortedReviews = useMemo(() => {
    if (!reviews) return [];
    const myReviews = reviews.filter((r) => r.user_id?._id === userId);
    const others = reviews.filter((r) => r.user_id?._id !== userId);
    return [...myReviews, ...others];
  }, [reviews, userId]);

  return (
    <div className="review-section">
      {/* Form nhập */}
      <div className="review-form">
        <h4>Đánh giá sự kiện này</h4>
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${star <= (hover || rating) ? "active" : ""}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
            >
              ★
            </span>
          ))}
        </div>

        <textarea
          placeholder="Viết cảm nhận của bạn..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button className="btn primary" onClick={handleSubmit}>
          Gửi đánh giá
        </button>
      </div>

      {/* Danh sách review */}
      <div className="review-list">
        {sortedReviews.length === 0 ? (
          <p className="no-review">Chưa có đánh giá nào.</p>
        ) : (
          sortedReviews.map((r, idx) => (
            <div
              key={idx}
              className={`review-item ${
                r.user_id?._id === userId ? "my-review" : ""
              }`}
            >
              <div className="review-header">
                <span className="review-user">
                  {r.user_id?._id === userId
                    ? "Bạn"
                    : r.user_id?.full_name || "Người dùng ẩn danh"}
                </span>
                <span className="review-stars">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
              </div>
              <p className="review-comment">{r.comments}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ReviewSection;
