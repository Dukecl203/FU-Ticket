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
          "http://localhost:9999/api/suggest-event",
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
        <h1>✨ Gợi Ý Sự Kiện Dành Cho Bạn</h1>
        <p className="dae-date">Ngày: {data.date}</p>
      </header>

      <div className="dae-suggestions-container">
        {data.suggestions.map((event, index) => (
          <div key={index} className="dae-event-card">
            <div className="dae-event-header">
              <h2 className="dae-event-name">{event.event_name}</h2>
              <span className="dae-attendees-badge">
                👥 {event.expected_attendees} người tham dự
              </span>
            </div>

            <p className="dae-event-description">{event.description}</p>

            <div className="dae-event-info">
              <div className="dae-info-item">
                <span className="dae-info-icon">📅</span>
                <span>{event.date}</span>
              </div>
              <div className="dae-info-item">
                <span className="dae-info-icon">📍</span>
                <span>{event.location}</span>
              </div>
            </div>

            <div className="dae-event-section">
              <h3>🎯 Hoạt động</h3>
              <ul className="dae-list">
                {event.activities.map((activity, idx) => (
                  <li key={idx}>{activity}</li>
                ))}
              </ul>
            </div>

            <div className="dae-event-section">
              <h3>💡 Lợi ích</h3>
              <ul className="dae-list">
                {event.benefits.map((benefit, idx) => (
                  <li key={idx}>{benefit}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="dae-footer">
        <button onClick={onReset} className="dae-back-btn">
          ← Quay lại nhập thông tin khác
        </button>
      </div>
    </div>
  );
}

export default EventList;
