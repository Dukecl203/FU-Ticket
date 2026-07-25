import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TicketCard.css";
import QRCode from "react-qr-code";

function TicketCard({ data }) {
  const navigate = useNavigate();

  // 🔹 Tạo danh sách vé riêng lẻ (chia theo quantity)
  const allTickets = data.tickets.flatMap((ticket) =>
    Array.from({ length: ticket.quantity }, (_, i) => ({
      ...ticket,
      pageIndex: i + 1,
      totalPage: ticket.quantity,
    }))
  );

  const [currentPage, setCurrentPage] = useState(0);
  const currentTicket = allTickets[currentPage];

  return (
    <div className="tk-ticket-container">
      {/* Breadcrumb */}
      <nav className="tk-breadcrumb">
        {data.breadcrumb.map((item, index) => (
          <span key={index}>
            {item}
            {index < data.breadcrumb.length - 1 && (
              <span className="tk-separator">{">"}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Event banner */}
      <div className="tk-ticket-card">
        <div
          className="tk-event-banner"
          onClick={() => navigate(`/event/${data.eventId}`)}
        >
          <img src={data.eventImage} alt={data.eventTitle} />
          <div className="tk-event-banner-overlay">
            <h1 className="tk-event-title">{data.eventTitle}</h1>
          </div>
        </div>

        {/* Event info + QR */}
        <div className="tk-ticket-content">
          <div className="tk-ticket-info-section">
            <div className="tk-info-left">
              <div className="tk-info-item">
                <div className="tk-info-label">Địa điểm</div>
                <div className="tk-info-value">
                  {data.location || "Đang cập nhật"}
                </div>
              </div>
              <div className="tk-info-item">
                <div className="tk-info-label">Thời gian</div>
                <div className="tk-info-value tk-green">{data.eventDate}</div>
              </div>
              <div className="tk-info-item">
                <div className="tk-info-label">Loại vé</div>
                <div className="tk-info-value tk-orange">
                  {currentTicket.type}
                </div>
              </div>
              {/* <div className="tk-info-item">
                <div className="tk-info-label">Vé số</div>
                <div className="tk-info-value">
                  {currentTicket.pageIndex}/{currentTicket.totalPage}
                </div>
              </div> */}
            </div>

            <div className="tk-info-right">
              <div className="tk-qr-section">
                <div className="tk-qr-placeholder">
                  <QRCode
                    value={`Item=${currentTicket.id} & Order=${data.eventId}`}
                    size={140}
                  />
                </div>
                <div className="tk-app-download-text">
                  <div className="tk-qr-code-text">mã QR vé</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="tk-pagination">
          {allTickets.map((_, index) => (
            <button
              key={index}
              className={`tk-page-btn ${index === currentPage ? "active" : ""}`}
              onClick={() => setCurrentPage(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Order Info */}
      <div className="tk-order-section">
        <div className="tk-order-header">
          <span className="tk-order-icon">📦</span>
          <span className="tk-order-title">Đơn hàng: {data.orderNumber}</span>
        </div>

        <table className="tk-order-table">
          <thead>
            <tr>
              <th>Ngày tạo đơn</th>
              <th>Phương thức thanh toán</th>
              <th>Tình trạng đơn hàng</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data.orderDate}</td>
              <td>{data.paymentMethod}</td>
              <td>{data.orderStatus}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Buyer Info */}
      <div className="tk-buyer-section">
        <div className="tk-section-header">
          <span className="tk-section-icon">👤</span>
          <span className="tk-section-title">Thông tin người mua</span>
        </div>

        <table className="tk-info-table">
          <tbody>
            <tr>
              <td className="tk-label-cell">Tên</td>
              <td className="tk-value-cell">{data.buyerName}</td>
            </tr>
            <tr>
              <td className="tk-label-cell">Email</td>
              <td className="tk-value-cell">{data.buyerEmail}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Ticket Details */}
      <div className="tk-order-details-section">
        <div className="tk-section-header">
          <span className="tk-section-icon">🎟️</span>
          <span className="tk-section-title">Chi tiết vé</span>
        </div>

        <table className="tk-details-table">
          <thead>
            <tr>
              <th>Loại vé</th>
              <th>Số lượng</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {data.tickets.map((ticket, index) => (
              <tr key={index}>
                <td>
                  <div className="tk-ticket-type">{ticket.type}</div>
                  <div className="tk-ticket-price">{ticket.price}</div>
                </td>
                <td>{ticket.quantity}</td>
                <td>{ticket.total}</td>
              </tr>
            ))}
            <tr className="tk-subtotal-row">
              <td colSpan="2">Tổng tạm tính</td>
              <td>{data.subtotal}</td>
            </tr>
            <tr className="tk-total-row">
              <td colSpan="2">Tổng tiền</td>
              <td className="tk-total-amount">{data.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TicketCard;
