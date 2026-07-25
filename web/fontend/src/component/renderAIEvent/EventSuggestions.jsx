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
  const categories = [
    { name: "Academic", icon: Book, color: "#4F46E5" },
    { name: "Music", icon: Music, color: "#EC4899" },
    { name: "Workshop", icon: Wrench, color: "#10B981" },
    { name: "Club", icon: Users, color: "#F59E0B" },
    { name: "Sports", icon: Trophy, color: "#EF4444" },
    { name: "Career", icon: Briefcase, color: "#10B981" },
    { name: "Festival", icon: Gift, color: "#F59E0B" },
    { name: "Technology", icon: Cpu, color: "#3B82F6" },
  ];

  const [formData, setFormData] = useState({
    category: "",
    people: "",
    detail: "",
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
    if (!formData.category || !formData.people || !formData.detail) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    onInputSuccess(formData); // 👈 gửi dữ liệu lên App
  };

  return (
    <div className="es-event-form-container">
      <div className="es-form-card">
        <h1 className="es-form-title">🎉 Gợi Ý Sự Kiện</h1>
        <p className="es-form-subtitle">
          Nhập thông tin để AI gợi ý 3 sự kiện phù hợp nhất
        </p>

        <form onSubmit={handleSubmit} className="es-event-form">
          {/* Thể loại */}
          <div className="es-form-group">
            <label>Thể loại sự kiện</label>
            <div className="es-category-list">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.name}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, category: cat.name }))
                  }
                  className={`es-category-item ${
                    formData.category === cat.name ? "es-active" : ""
                  }`}
                  style={{
                    borderColor:
                      formData.category === cat.name ? cat.color : "#ddd",
                    color:
                      formData.category === cat.name ? cat.color : "#333",
                  }}
                >
                  <cat.icon size={18} /> {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Số người */}
          <div className="es-form-group">
            <label htmlFor="people">Số người tham dự</label>
            <input
              type="number"
              id="people"
              name="people"
              value={formData.people}
              onChange={handleChange}
              placeholder="VD: 50"
              min="1"
              required
            />
          </div>

          {/* Chi tiết */}
          <div className="es-form-group">
            <label htmlFor="detail">Chi tiết mô tả</label>
            <textarea
              id="detail"
              name="detail"
              value={formData.detail}
              onChange={handleChange}
              placeholder="VD: Sự kiện âm nhạc ngoài trời cho sinh viên yêu thích EDM..."
              rows="4"
              required
            ></textarea>
          </div>

          <button type="submit" className="es-submit-button">
            🔮 Xem 3 Gợi Ý Sự Kiện
          </button>
        </form>
      </div>
    </div>
  );
}

export default EventSuggestions;
