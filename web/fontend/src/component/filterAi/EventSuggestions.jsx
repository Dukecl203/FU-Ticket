import { useState } from "react";
import "./EventSuggestions.css";
import {
  Book,
  Music,
  Wrench,
  Users,
  Trophy,
  Briefcase,
  Gift,
  Cpu,
} from "lucide-react";

function EventSuggestions({ onInputSuccess }) {
  // Thay thế formData cũ
  const [formData, setFormData] = useState({
    query: "", // Trường input duy nhất
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.query) {
      alert("Vui lòng nhập mô tả sự kiện bạn muốn tìm!");
      return;
    }
    // Gửi object { query: "..." }
    onInputSuccess(formData); 
  };

  return (
    <div className="es-event-form-container">
      <div className="es-form-card">
        <h1 className="es-form-title">🔍 Tìm Sự Kiện Theo Sở Thích</h1>
        <p className="es-form-subtitle">
          Mô tả sự kiện bạn muốn tìm (VD: workshop công nghệ, âm nhạc ngoài trời, hội chợ việc làm...)
        </p>

        <form onSubmit={handleSubmit} className="es-event-form">
          {/* Trường nhập liệu duy nhất */}
          <div className="es-form-group">
            <label htmlFor="query">Mô tả sự kiện bạn muốn tìm</label>
            <textarea
              id="query"
              name="query"
              value={formData.query}
              onChange={handleChange}
              placeholder="Tôi muốn tìm sự kiện về trí tuệ nhân tạo, có thể giao lưu với các chuyên gia..."
              rows="4"
              required
            ></textarea>
          </div>

          <button type="submit" className="es-submit-button">
            🔮 Xem 3 Sự Kiện Phù Hợp
          </button>
        </form>
      </div>
    </div>
  );
}

export default EventSuggestions;
