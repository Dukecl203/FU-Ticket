import { useEffect, useState } from "react";
import "./TicketBooking.css";
import TicketSelector from "./TicketSelector";
import Header from "./Header";
import { getWithExpiry } from "../../detailEvent/utils/storage.js";
import { useNavigate } from "react-router-dom";

function TicketBooking() {
  const [tickets, setTickets] = useState({});
  const [eventData, setEventData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const value = getWithExpiry("cart");
    if (!value) {
      // ❌ Không check hết hạn nữa → chỉ quay về nếu không có dữ liệu
      navigate("/");
      return;
    }

    setEventData(value.event);

    // init tickets nếu có ticketTypes
    const init = {};
    value.event?.ticketTypes?.forEach?.((t) => {
      init[t.id] = 0;
    });
    setTickets(init);
  }, [navigate]);

  const handleTicketChange = (type, value) => {
    setTickets((prev) => ({
      ...prev,
      [type]: Math.max(0, value),
    }));
  };

  if (!eventData) return null; // chờ load

  return (
    <div className="ticket-booking">
      <Header />

      <div className="booking-container">
        <div className="venue-section">
          {/* ✅ Chỉ render ảnh */}
          <img
            src={eventData.image}
            alt={eventData.title}
            className="venue-image"
          />
        </div>

        <div className="ticket-section">
          <TicketSelector/>
        </div>
      </div>
    </div>
  );
}

export default TicketBooking;
