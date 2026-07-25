  import React, { useEffect, useState } from "react";
  import { Swiper, SwiperSlide } from "swiper/react";
  import { Navigation } from "swiper/modules";
  import "swiper/css";
  import "swiper/css/navigation";
  import "./EventCarousel.css";
  import axios from "axios";
  import { useNavigate } from "react-router-dom";

  export default function EventCarousel() {
    const [activeTab, setActiveTab] = useState("week"); // mặc định là "Cuối tuần này"
    const [events, setEvents] = React.useState([]);
    const navigate = useNavigate();
    useEffect(() => {
  const fetchEvents = () => {
    axios
      .get(`http://localhost:9999/api/binh/events?mode=${activeTab}`)
      .then((res) => setEvents(res.data.data))
      .catch((err) => console.error(err));
  };

  fetchEvents();

  const interval = setInterval(fetchEvents, 5 * 60 * 1000); // 5 phút gọi lại

  return () => clearInterval(interval);
}, [activeTab]);

    return (
      <div className="container">
        <div className="event-section">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === "week" ? "active" : ""}`}
              onClick={() => setActiveTab("week")}
            >
              Cuối tuần này
            </button>
            <button
              className={`tab ${activeTab === "month" ? "active" : ""}`}
              onClick={() => setActiveTab("month")}
            >
              Tháng này
            </button>
            <a href="#" className="see-more">
              Xem thêm
            </a>
          </div>
          <div className="event-carousel">
            {/* Carousel */}
            {events.length === 0 && <p>Khoang thoi gian nay khong co su kien</p>}
            <Swiper
              modules={[Navigation]}
              navigation
              spaceBetween={20}
              slidesPerView={3.5}
            >
              {events.map((event, index) => (
                <SwiperSlide key={index}>
                  <div
                    className="event-card"
                    onClick={() => navigate(`/event/${event.id}`)}
                  >
                    <img src={event.img} alt={event.title} />
                    <div className="card-body">
                      <h3 className="card-title">{event.title}</h3>
                      <h4 className="card-date">{event.location}</h4>
                      <p className="card-price">
                    {event.price === 0
                      ? "Miễn phí"
                      : `${event.price.toLocaleString("vi-VN")} ₫`}
                  </p>

                      <p className="card-date">📅 {event.start_time}→{event.end_time}</p>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    );
  }
