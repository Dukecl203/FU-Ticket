import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import axios from "axios";
import "./TrendingEvents.css";
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import { useNavigate } from "react-router-dom";
const TrendingEvents = () => {
const navigate = useNavigate();
const [trendingEvents,setTrendingEvents] = React.useState([]);
      useEffect(() => {
    axios
      .get("http://localhost:9999/api/binh/trendings")
      .then((res) => {
        console.log(res.data);

       setTrendingEvents(res.data.data);
      })
      .catch((err) => console.error(err));
  }, []);
  const settings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 3.5,  // tối đa 4 event mỗi lần
    slidesToScroll: 1,
    arrows: true,
  };

  return (
    <div className="container">
    <div className="trending-container">
      <div className="trending-header">
        <span className="emoji">🔥</span>
        <h1>Trending Events</h1>
      </div>

      <Slider {...settings}>
        {trendingEvents.map((event, index) => (
          <div key={event.id} className="trending-card">
            {/* Số hạng */}
            <span className="rank">{index + 1}</span>

            <div className="image-wrapper">
              <img onClick={() => navigate(`/event/${event.id}`)} src={event.image} alt={event.name} />
            </div>

            <p className="event-name">{event.name}</p>
            <p className="event-date">{event.date}</p>
          </div>
        ))}
      </Slider>
    </div></div>
  );
};

export default TrendingEvents;
