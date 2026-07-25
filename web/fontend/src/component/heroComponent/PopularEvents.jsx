import React, { useEffect, useState } from "react";
import { Calendar, MapPin, Clock, ArrowRight, Users } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./PopularEvents.css";

const PopularEvents = ({ selectedCategory }) => {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`http://localhost:9999/api/binh/events/category?category=${selectedCategory}`)
      .then((res) => setEvents(res.data.data || []))
      .catch((err) => console.error(err));
  }, [selectedCategory]);

  return (
    <section className="popular-events section">
      <div className="container">
        <div className="section-header">
          <h3 className="section-title">
            {selectedCategory === "All"
              ? "Popular Events"
              : `${selectedCategory} Events`}
          </h3>
          <a href="/events" className="view-all">
            View All Events →
          </a>
        </div>

        <div className="events-grid">
          {events.length > 0 ? (
            events.slice(0, 4).map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-image">
                  <img src={event.image} alt={event.title} />
                  <div className="event-category">{event.category}</div>
                  <div className="event-price">
                    {event.price === 0
                      ? "Miễn phí"
                      : `${event.price.toLocaleString("vi-VN")} ₫`}
                  </div>
                </div>

                <div className="event-content">
                  <h3 className="event-title">{event.title}</h3>

                  <div className="event-details">
                    <div className="event-detail">
                      <Calendar size={16} />
                      <span>Start date:{event.start_time}</span>
                    </div>
                    <div className="event-detail">
                      <Calendar size={16} />
                      <span>End date:{event.end_time}</span>
                    </div>
                    <div className="event-detail">
                      <Users size={16} />
                      <span>{event.artist}</span>
                    </div>
                    <div className="event-detail">
                      <MapPin size={16} />
                      <span>{event.location}</span>
                    </div>
                  </div>

                  <div className="event-footer">
                    <div className="event-attendees">
                      {event.attendees || 0} attending
                    </div>
                    <button
                      className="event-btn"
                      onClick={() => navigate(`/event/${event.id}`)}
                    >
                      View Details <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-events">
              <p>No events found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PopularEvents;
