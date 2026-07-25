import "./TicketInfo.css";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setWithExpiry } from "../utils/storage.js";
import { useStore } from "../../../hooks/useStore.jsx";

function TicketInfo({ id, discount, event }) {
  const [tickets, setTickets] = useState([]);
  const [products, setProducts] = useState([]);
  const [notification, setNotification] = useState("");
  const store = useStore();
  const user = store?.dataUser || {};
  const userId = user?.id || null;
  const navigate = useNavigate();
const email = user?.email || "";
const isFPTEmail = email.endsWith("@fpt.edu.vn");

useEffect(() => {
  if (!id) return;

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`http://localhost:9999/api/binh/tickets/${id}`);
      let filteredData = res.data.data;

      // ✅ Check user FPT
      const email = user?.email || "";
      const isFPTEmail = email.endsWith("@fpt.edu.vn");

      filteredData = filteredData.map(item => {
        let price = parseInt(item.price.replace(/\D/g, "")) || 0;
        let newItem = { ...item, originalPrice: item.price };

        // 🎓 Miễn phí cho FPT student
        if (item.isFPT && isFPTEmail && item.type === "ticket") {
          newItem.price = "0 ₫";
        }

        // 💸 Áp dụng discount
        if (discount && discount.percentage) {
          if (
            discount.type === "All" ||
            (discount.type === "Ticket" && item.type === "ticket") ||
            (discount.type === "Merch" && item.type !== "ticket")
          ) {
            const discountedPrice = price - (price * discount.percentage) / 100;
            newItem.price = discountedPrice.toLocaleString("vi-VN") + " ₫";
          }
        }

        return newItem;
      });

      // Phân loại ticket & product
      const ticketItems = filteredData.filter(item => item.type === "ticket");
      const productItems = filteredData.filter(item => item.type !== "ticket");

      // đánh dấu ticket phổ biến
      if (ticketItems.length > 0) ticketItems[0] = { ...ticketItems[0], popular: true };

      setTickets(ticketItems);
      setProducts(productItems);

    } catch (err) {
      console.error(err);
    }
  };

  fetchTickets();
}, [id, discount, user]);

  const handleAddToCart = (item, type) => {
    const ttl = (10 * 60 + 10) * 1000; // 10p10s

    // Xóa giỏ cũ trước khi lưu mới
    localStorage.removeItem("cart");

    const cartData = {
      userId:event.og._id,
      event,
      discount,
      tickets: type === "ticket" ? [item] : [],
      products: type === "product" ? [item] : [],
    };

    setWithExpiry("cart", cartData, ttl);

    setNotification("Đã thêm vào giỏ hàng, chuyển hướng...");
    setTimeout(() => navigate("/query"), 1000);
  };

  return (
    <div className="de-ticket-info">
      {notification && <div className="de-notification">{notification}</div>}

      <h2 className="de-section-title">Thông tin vé</h2>
      <div className="de-tickets-list">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className={`de-ticket-card ${ticket.popular ? "de-popular" : ""}`}
          >
            <div className="de-ticket-header">
              <div className="de-ticket-name-section">
                <h3 className="de-ticket-name">{ticket.name}</h3>
                {ticket.popular && (
                  <span className="de-popular-badge">Phổ biến nhất</span>
                )}
              </div>
              <div className="de-ticket-price-section">
                <div className="de-price-container">
                  {ticket.originalPrice && (
                    <span className="de-original-price">{ticket.originalPrice}</span>
                  )}
                  <span className="de-current-price">{ticket.price}</span>
                </div>
                {ticket.valid ? (
                  <button
                    className="de-buy-button"
                    onClick={() => handleAddToCart(ticket, "ticket")}
                  >
                    Chọn vé
                  </button>
                ) : (
                  <button className="de-buy-button de-expired" disabled>
                    Hết Hàng
                  </button>
                )}
              </div>
            </div>
            <div className="de-ticket-body">
              <p className="de-ticket-description">{ticket.description}</p>
              <p className="de-ticket-note">{ticket.note}</p>
            </div>
          </div>
        ))}
      </div>

      {products.length > 0 && (
        <>
          <h2 className="de-section-title">Sản phẩm kèm theo</h2>
          <div className="de-products-list">
            {products.map((product) => (
              <div key={product.id} className="de-ticket-card">
                <div className="de-ticket-header">
                  <div className="de-ticket-name-section">
                    <h3 className="de-ticket-name">{product.name}</h3>
                  </div>
                  {product.image_url && (
                    <div className="de-product-image-container">
                        <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="de-product-image" 
                        />
                    </div>
                  )}
                  <div className="de-ticket-price-section">
                    <div className="de-price-container">
                      {product.originalPrice && (
                        <span className="de-original-price">
                          {product.originalPrice}
                        </span>
                      )}
                      <span className="de-current-price">{product.price}</span>
                    </div>
                    <button
                      className="de-buy-button"
                      onClick={() => handleAddToCart(product, "product")}
                    >
                      Chọn sản phẩm
                    </button>
                  </div>
                </div>
                <div className="de-ticket-body">
                  <p className="de-ticket-description">{product.description}</p>
                  <p className="de-ticket-note">{product.note}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TicketInfo;
