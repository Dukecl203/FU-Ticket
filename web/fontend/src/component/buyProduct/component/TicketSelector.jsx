import { useEffect, useState } from "react";
import "./TicketSelector.css";
import { getWithExpiry } from "../../detailEvent/utils/storage.js";
import axios from "axios";
import { useStore } from "../../../hooks/useStore.jsx";

function TicketSelector() {
  const store = useStore();
  const user = store?.dataUser || {};
  const userId = user?.id || null;

  const [cartData, setCartData] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    const value = getWithExpiry("cart");
    if (value) {
      setCartData(value);
      const init = {};
      [...(value.tickets || []), ...(value.products || [])].forEach((item) => {
        init[item.id] = 0;
      });
      setSelected(init);
    }
  }, []);

  if (!cartData) {
    return <div className="bp-ticket-selector">Không có dữ liệu giỏ hàng</div>;
  }

  const { event, tickets = [], products = [], discount } = cartData;

  const parsePrice = (priceStr) =>
    Number((priceStr || "0").toString().replace(/[^\d]/g, ""));
  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + " ₫";

  const handleChange = (id, delta, max) => {
    setSelected((prev) => {
      const newVal = Math.min(Math.max((prev[id] || 0) + delta, 0), max);
      console.log(selected);
      return { ...prev, [id]: newVal };
    });
  };

  // --- Tính tiền gốc ---
  const ticketTotal = tickets.reduce(
    (sum, t) => sum + parsePrice(t.price) * (selected[t.id] || 0),
    0
  );
  const productTotal = products.reduce(
    (sum, p) => sum + parsePrice(p.price) * (selected[p.id] || 0),
    0
  );
  const subtotal = ticketTotal + productTotal;
  const totalItems = Object.values(selected).reduce((a, b) => a + b, 0);

  // --- Áp dụng discount từ cart ---
  let discountAmount = 0;
  let totalPrice = subtotal;

  if (discount) {
    const percentage = discount.percentage || 0;
    const type = discount.type || "All";

    if (type === "All") {
      discountAmount = (subtotal * percentage) / 100;
      totalPrice = subtotal ;
    } else if (type === "Ticket") {
      const ticketDiscount = (ticketTotal * percentage) / 100;
      discountAmount = ticketDiscount;
      totalPrice = ticketTotal  + productTotal;
    } else if (type === "Product") {
      const productDiscount = (productTotal * percentage) / 100;
      discountAmount = productDiscount;
      totalPrice = ticketTotal + (productTotal);
    }
  }

  // đảm bảo không âm
  if (totalPrice < 0) totalPrice = 0;
const handleContinue = async () => {
  try {
    // 1️⃣ Lấy số dư ví hiện tại
    const walletRes = await axios.get(`http://localhost:9999/api/user/wallet/${userId}`);
    const walletBalance = walletRes.data.wallet.balance || 0;

    if (walletBalance < totalPrice) {
      return alert("⚠️ Ví không đủ số dư để thanh toán. Vui lòng nạp thêm tiền.");
    }

    // 2️⃣ Gửi payload thanh toán
    const payload = {
      userId,
      selected,
      event,
      amount: totalPrice,
      discount: cartData.discount || null,
      sellerId: cartData.userId,
    };

    const res = await axios.post("http://localhost:9999/api/payment/wallet", payload);

    if (res.data.success) {
        window.location.href = "/firm?orderId=" + res.data.order._id;
    } else {
      alert(res.data.message || "Thanh toán thất bại");
    }
  } catch (err) {
    console.error(err);
    alert("Có lỗi khi thanh toán bằng ví");
  }
};




  return (
    <div className="bp-ticket-selector">
      <div className="bp-selector-content">
        {/* Ngày & giờ */}
        <div className="bp-date-section">
          <h3 className="bp-section-title">Ngày & giờ</h3>
          <div className="bp-date-display">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect
                x="3"
                y="4"
                width="14"
                height="13"
                rx="2"
                stroke="#666"
                strokeWidth="1.5"
              />
              <path d="M7 2V5M13 2V5M3 8H17" stroke="#666" strokeWidth="1.5" />
            </svg>
            <span>
              {event?.start_time} - {event?.end_time}
            </span>
          </div>
        </div>

        {/* Vé */}
        {tickets.length > 0 && (
          <div className="bp-ticket-types-section">
            <h3 className="bp-section-title">Loại vé</h3>
            <div className="bp-ticket-list">
              {tickets.map((t) => {
                const max = t.quantity_total - t.quantity_sold;
                return (
                  <div key={t.id} className="bp-ticket-item">
                    <div className="bp-ticket-info">
                      <span className="bp-ticket-name">{t.name}</span>
                      <span className="bp-ticket-price">
                        {formatPrice(parsePrice(t.price))}
                      </span>
                    </div>
                    <div className="bp-quantity-control">
                      <button
                        onClick={() => handleChange(t.id, -1, max)}
                        disabled={(selected[t.id] || 0) === 0}
                      >
                        −
                      </button>
                      <span className="bp-quantity-value">
                        {selected[t.id] || 0}
                      </span>
                      <button
                        onClick={() => handleChange(t.id, 1, max)}
                        disabled={(selected[t.id] || 0) >= max}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sản phẩm */}
        {products.length > 0 && (
          <div className="bp-ticket-types-section">
            <h3 className="bp-section-title">Sản phẩm</h3>
            <div className="bp-ticket-list">
              {products.map((p) => {
                const max = p.quantity_total - p.quantity_sold;
                return (
                  <div key={p.id} className="bp-ticket-item">
                    <div className="bp-ticket-info">
                      <span className="bp-ticket-name">{p.name}</span>
                      <span className="bp-ticket-price">
                        {formatPrice(parsePrice(p.price))}
                      </span>
                    </div>
                    <div className="bp-quantity-control">
                      <button
                        onClick={() => handleChange(p.id, -1, max)}
                        disabled={(selected[p.id] || 0) === 0}
                      >
                        −
                      </button>
                      <span className="bp-quantity-value">
                        {selected[p.id] || 0}
                      </span>
                      <button
                        onClick={() => handleChange(p.id, 1, max)}
                        disabled={(selected[p.id] || 0) >= max}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Danh sách đã chọn */}
        <div className="bp-selected-tickets-section">
          <div
            className="bp-selected-header"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className={`bp-expand-icon ${isExpanded ? "bp-expanded" : ""}`}
            >
              <path
                d="M5 8L10 13L15 8"
                stroke="#333"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="bp-selected-title">Đã chọn</span>
          </div>

          {isExpanded && totalItems > 0 && (
            <div className="bp-selected-list">
              {[...tickets, ...products].map(
                (item) =>
                  selected[item.id] > 0 && (
                    <div key={item.id} className="bp-selected-item">
                      <span>
                        {item.name} x {selected[item.id]}
                      </span>
                      <span>
                        {formatPrice(
                          parsePrice(item.price) * selected[item.id]
                        )}
                      </span>
                    </div>
                  )
              )}


              {discount && (
                <div className="bp-total-summary discount-applied">
                  <span>Đã Giảm giá ({discount.percentage}%):</span>
                  <strong>-{formatPrice(discountAmount)}</strong>
                </div>
              )}

              <div className="bp-total-summary final">
                <span>Tổng cộng:</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nút tiếp tục */}
      <div className="bp-selector-footer">
        <button
          className="bp-continue-btn"
          disabled={totalItems === 0}
          onClick={handleContinue}
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}

export default TicketSelector;
