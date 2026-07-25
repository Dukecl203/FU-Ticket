import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

import EventHero from "./component/EventHero";
import EventDetails from "./component/EventDetails";
import TicketInfo from "./component/TicketInfo";
import Sidebar from "./component/Sidebar";
import Header from "../heroComponent/Header";
import Footer from "../heroComponent/Footer";
import EventCard from "../listEvents/components/EventCard";
import LoadingPage from "./component/LoadingPage";
import "./App.css";
import ReviewSection from "./component/ReviewSection";

function Detail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [discount, setDiscount] = useState({});
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    axios
      .get(`http://localhost:9999/api/binh/events/${id}`)
      .then((res) => {
        const eventData = res.data.data;
        setEvent(eventData);
        if (eventData?.category) {
          axios
            .get(
              `http://localhost:9999/api/binh/events/category?category=${eventData.category}`
            )
            .then((res2) => {
              setRelatedEvents(res2.data.data || []);
            })
            .catch((err) => console.error(err));
        }
      })
      .catch((err) => console.error(err));
  }, [id]);

  if (!event) return <LoadingPage />;

  return (
    <div className="de-app">
      <Header />
      <EventHero event={event} />
      <div className="de-main-content">
        <div className="de-content-wrapper">
          <div className={`de-left-column ${!true ? "de-full-width" : ""}`}>
            {/* <EventDetails event={event} /> */}
            <TicketInfo id={id} discount={discount} event={event} />
            {event.detail && (
              <div className="de-sponsor-info">
                <h3>Chi tiết sự kiện</h3>
                <div
                  style={{
                    lineHeight: "1.8",
                    color: "#333",
                  }}
                  dangerouslySetInnerHTML={{ __html: event.detail }}
                />
              </div>
            )}
            {event.description && !event.detail && (
              <div className="de-sponsor-info">
                <h3>Mô tả sự kiện</h3>
                <p>{event.description}</p>
              </div>
            )}
            <div className="de-sponsor-info">
              <h3>Nhà tổ chức</h3>
              <p>
                <strong>{event.organizer?.name || event.artist?.name}</strong>
              </p>
              <p>Email: {event.organizer?.email || event.artist?.email}</p>
              <p>Điện thoại: {event.organizer?.phone || event.artist?.phone}</p>
            </div>

            <div>
              {event && id && (
                <ReviewSection
                  eventId={id}
                  reviews={reviews}
                  setReviews={setReviews}
                />
              )}
            </div>
            <div className="de-recommend-title">Có thể bạn cũng thích</div>
            <div className="de-events-grid">
              {relatedEvents
                .filter((e) => e.id !== event.id)
                .map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
            </div>
          </div>

          {/* Chỉ render Sidebar khi có nội dung */}
          <div className="de-right-column">
            <Sidebar discount={discount} id={id} setDiscount={setDiscount} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Detail;
