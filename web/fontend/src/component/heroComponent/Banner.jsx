import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import "./Banner.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Banner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:9999/api/binh/banners")
      .then((res) => setFeaturedEvents(res.data.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (featuredEvents.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
      }, 7000);
      return () => clearInterval(timer);
    }
  }, [featuredEvents.length]);

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
  const prevSlide = () =>
    setCurrentSlide(
      (prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length
    );
  const weekdays = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const truncateString = (str, maxLength = 180) => {
    if (!str) return "";
    if (str.length <= maxLength) {
      return str;
    }
    // Cắt chuỗi đến độ dài tối đa
    let truncated = str.substring(0, maxLength);

    // Đảm bảo không cắt giữa chừng một từ, tìm vị trí khoảng trắng cuối cùng
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > 0) {
      truncated = truncated.substring(0, lastSpace);
    }

    return truncated + "...";
  };

  function formatDate(date) {
    const dayName = weekdays[date.getDay()]; // Thứ
    const day = date.getDate().toString().padStart(2, "0"); // Ngày
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Tháng
    const hours = date.getHours().toString().padStart(2, "0"); // Giờ
    const minutes = date.getMinutes().toString().padStart(2, "0"); // Phút

    return `${dayName}, ${day}/${month}, ${hours}:${minutes}`;
  }
  return (
    <section className="banner">
      <div className="banner-container">
        {featuredEvents.map((event, index) => (
          <div
            key={event.id}
            className={`banner-slide ${index === currentSlide ? "active" : ""}`}
          >
            <div className="banner-image">
              <img src={event.image} alt={event.title} />
              <div className="banner-overlay"></div>
            </div>

            <div className="banner-content fade-in">
              <div className="container">
                <div className="banner-text">
                  <span className="banner-category">{event.category}</span>
                  <h1 className="banner-title">{event.title}</h1>
                  <p className="banner-subtitle">
                    {truncateString(event.subtitle, 300)}
                  </p>

                  <div className="banner-details">
                    <div className="banner-detail">
                      <Calendar size={18} />
                      <span>
                        {formatDate(new Date(event.date_start))} -{" "}
                        {formatDate(new Date(event.date_end))}
                      </span>
                    </div>
                    <div className="banner-detail">
                      <MapPin size={18} />
                      <span>{event.location}</span>
                    </div>
                  </div>

                  <button
                    className="btn-primary banner-btn"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    Get Tickets
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button className="banner-nav banner-nav-prev" onClick={prevSlide}>
          <ChevronLeft size={24} />
        </button>
        <button className="banner-nav banner-nav-next" onClick={nextSlide}>
          <ChevronRight size={24} />
        </button>

        <div className="banner-dots">
          {featuredEvents.map((_, index) => (
            <button
              key={index}
              className={`banner-dot ${index === currentSlide ? "active" : ""}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Banner;
