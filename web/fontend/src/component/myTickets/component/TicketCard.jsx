import React from "react";
import "./TicketCard.css";
import { useNavigate } from "react-router-dom";

function TicketCard({ ticket }) {
  const date = new Date(ticket.orderDate);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const navigate = useNavigate();
  // ✅ Hiển thị trạng thái với màu và icon
  const renderStatus = (status) => {
    switch (status) {
      case "paid":
        return <span className="mt-status mt-success">✔ Thành công</span>;
      case "pending":
        return <span className="mt-status mt-pending">⏳ Đang xử lý</span>;
      case "cancelled":
        return <span className="mt-status mt-failed">✖ Đã hủy</span>;
      case "refunded":
        return <span className="mt-status mt-refunded">↩ Đã hoàn tiền</span>;
      default:
        return <span className="mt-status mt-default">Không xác định</span>;
    }
  };

  return (
    <div
      className="mt-ticket-card"
      onClick={() => navigate(`detail/${ticket.id}`)}
    >
      <div className="mt-ticket-date">
        <div className="mt-date-number">{day}</div>
        <div className="mt-date-month">Tháng {month}</div>
        <div className="mt-date-year">{year}</div>
      </div>

      <div className="mt-ticket-details">
        <h3 className="mt-ticket-title">{ticket.eventNames}</h3>
        <p className="mt-ticket-time">
          ⏰ {new Date(ticket.start_date).toLocaleString("vi-VN")} →{" "}
          {new Date(ticket.end_date).toLocaleString("vi-VN")}
        </p>
        <div className="mt-ticket-badges">{renderStatus(ticket.status)}</div>

        <div className="mt-ticket-info">
          <div className="mt-info-row">
            <span className="mt-info-icon">🎫</span>
            <span className="mt-info-text">Mã đơn: {ticket.order_code}</span>
          </div>

          <div className="mt-info-row">
            <span className="mt-info-icon">🏷</span>
            <span className="mt-info-text">Sản phẩm: {ticket.product_name}</span>
          </div>
          <div className="mt-info-row">
            <span className="mt-info-icon">🎟</span>
            <span className="mt-info-text">Số lượng vé: {ticket.quantity}</span>
          </div>

          <div className="mt-info-row">
            <span className="mt-info-icon">💰</span>
            <span className="mt-info-text">
              Tổng tiền: {ticket.total.toLocaleString()}₫
            </span>
          </div>

          <div className="mt-info-row">
            <span className="mt-info-icon">📍</span>
            <span className="mt-info-text">{ticket.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketCard;
