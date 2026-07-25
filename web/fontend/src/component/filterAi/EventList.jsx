import { useState, useEffect } from "react";
import axios from "axios";
import "./EventList.css";

function EventList({ formData, onReset }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
    console.log(formData);
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);

        // 🧠 Gửi dữ liệu form lên backend bằng axios
        const res = await axios.post(
          "http://localhost:9999/api/suggest-our-event",
          formData
        );

        // axios tự parse JSON nên có thể lấy trực tiếp:
        setData(res.data);
      } catch (error) {
        console.error("❌ Lỗi khi gọi API:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [formData]);

  if (loading)
  return (
    <div className="dae-loading">
      <div className="dae-spinner"></div>
      <p className="dae-loading-text">Đang tải gợi ý sự kiện...</p>
    </div>
  );


  if (!data || !data.suggestions) {
    return (
      <div className="dae-empty">
        <p>Không có gợi ý phù hợp.</p>
        <button onClick={onReset} className="dae-back-btn">
          ← Quay lại nhập thông tin
        </button>
      </div>
    );
  }

return (
    <div className="dae-app">
      <header className="dae-header">
        <h1>✨ 3 Sự Kiện Phù Hợp Nhất</h1>
        <p className="dae-date">Yêu cầu của bạn: **{formData.query}**</p>
      </header>

      <div className="dae-suggestions-container">
        {data.suggestions.map((event, index) => (
          <div key={index} className="dae-event-card">
            <div className="dae-event-header">
              <h2 className="dae-event-name">{event.title}</h2> {/* Dùng event.title */}
              {/* Thêm Category name */}
              <span className="dae-attendees-badge">
                🏷️ {event.category_id ? event.category_id.name : 'N/A'}
              </span>
            </div>

            <p className="dae-event-description">**Mô tả:** {event.description}</p>
            <p className="dae-event-description">**Chi tiết:** {event.detail}</p>
            
            {/* HIỂN THỊ LÝ DO AI CHỌN */}
            <div className="dae-event-section dae-reasoning">
                <h3>⭐ Lý do được chọn</h3>
                <p>{event.reasoning}</p>
            </div>

            <div className="dae-event-info">
              <div className="dae-info-item">
                <span className="dae-info-icon">📅</span>
                {/* Format Date tùy theo nhu cầu */}
                <span>{new Date(event.start_time).toLocaleDateString()}</span>
              </div>
              <div className="dae-info-item">
                <span className="dae-info-icon">📍</span>
                <span>{event.location}</span>
              </div>
            </div>
            
            {/* ... (Bỏ phần activities và benefits vì dữ liệu gốc không có) */}

          </div>
        ))}
      </div>

      <div className="dae-footer">
        <button onClick={onReset} className="dae-back-btn">
          ← Tìm kiếm lại
        </button>
      </div>
    </div>
  );
}

export default EventList;