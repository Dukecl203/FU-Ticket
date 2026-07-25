import "./App.css";
import TicketCard from "./component/TicketCard";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../heroComponent/Footer";
import Header from "../heroComponent/Header";
import { useStore } from "../../hooks/useStore";

function App() {
  const [ticket, setTicket] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const userd = store?.dataUser || {};

  // 🕒 Format thời gian hiển thị tiếng Việt
  function formatEventDate(start_time, end_time) {
    const start = new Date(start_time);
    const end = new Date(end_time);
    const options = { hour: "2-digit", minute: "2-digit" };

    const startTime = start.toLocaleTimeString("vi-VN", options);
    const endTime = end.toLocaleTimeString("vi-VN", options);
    const months = [
      "01","02","03","04","05","06","07","08","09","10","11","12",
    ];

    const startDate = `${startTime}, ${start
      .getDate()
      .toString()
      .padStart(2, "0")} tháng ${months[start.getMonth()]}, ${start.getFullYear()}`;
    const endDate = `${endTime}, ${end
      .getDate()
      .toString()
      .padStart(2, "0")} tháng ${months[end.getMonth()]}, ${end.getFullYear()}`;
    return `${startDate} - ${endDate}`;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🧭 Lấy chi tiết order
        const res = await axios.get(`http://localhost:9999/api/orders/${id}/details`);
        const data = res.data;
        const order = data.order || {};
        const user = data.user || {};
        const products = data.products || [];

        // 🚨 Kiểm tra quyền truy cập
        if (userd?.id !== user?.id) {
          alert("Bạn không có quyền truy cập vào vé này!");
          navigate("/");
          return;
        }

        // 🎟️ Lấy danh sách vé chi tiết
        const itemRes = await axios.get(`http://localhost:9999/api/order/items/${id}`);
        const itemData = itemRes.data;

        const ticketData = {
          id: id,
          eventId: products[0]?.event?.id,
          orderNumber: order.order_id,
          eventTitle: products[0]?.event?.title || "",
          eventImage: products[0]?.event?.img || "",
          eventDate: formatEventDate(
            products[0]?.event?.start_time,
            products[0]?.event?.end_time
          ),
          location: products[0]?.event?.location || "",
          orderDate: new Date(order.created_at).toLocaleString("vi-VN"),
          paymentMethod: "MoMo",
          orderStatus: order.status,
          buyerName: user.name,
          buyerEmail: user.email,
          tickets: itemData.items.map((p) => ({
            id: p._id,
            type: p.product_id.name,
            quantity: 1,
            price: p.product_id.price.toLocaleString("vi-VN") + " ₫",
            status: p.status,
          })),
          subtotal: order.total_amount.toLocaleString("vi-VN") + " ₫",
          total: order.total_amount.toLocaleString("vi-VN") + " ₫",
          breadcrumb: ["Trang chủ", "Vé của tôi", "Chi tiết vé"],
        };

        setTicket(ticketData);
      } catch (err) {
        console.error("❌ Lỗi khi tải dữ liệu:", err);
        navigate("/");
      }
    };

    fetchData();
  }, [id, userd, navigate]);

  if (!ticket)
    return (
      <div className="tk-loading-container">
        <div className="tk-spinner"></div>
        <div className="tk-loading-text">Đang tải vé của bạn...</div>
      </div>
    );

  return (
    <div>
      <Header />
      <div className="tk-app">
        <TicketCard data={ticket} />
      </div>
      <Footer />
    </div>
  );
}

export default App;
