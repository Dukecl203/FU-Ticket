import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./component/Sidebar";
import FilterTabs from "./component/FilterTabs";
import TicketCard from "./component/TicketCard";
import Recommendations from "./component/Recommendations";
import axios from "axios";
import "./App.css";
import Header from "../heroComponent/Header";
import Footer from "../heroComponent/Footer";
import { useStore } from "../../hooks/useStore.jsx";
import { io } from "socket.io-client";

function App() {
 const [activeTab, setActiveTab] = useState("all"); // Lọc trạng thái vé
 const [activeView, setActiveView] = useState("upcoming"); // Lọc thời gian
 const [tickets, setTickets] = useState([]);
 const [loading, setLoading] = useState(true);
 const store = useStore();
 const userd = store?.dataUser || {};
 const userId = userd?.id || null;


 const fetchAndFilterTickets = useCallback(async () => {
  if (!userId) {
   setLoading(false);
   return;
  }

  try {
   setLoading(true);
   const res = await axios.get(`http://localhost:9999/api/orders/${userId}`);
   let fetched = res.data.orders || [];

   // Lọc theo trạng thái
   if (activeTab === "paid") {
    fetched = fetched.filter((t) => t.status === "paid");
   } else if (activeTab === "processing") {
    fetched = fetched.filter((t) => t.status === "PENDING");
   } else if (activeTab === "cancelled") {
    fetched = fetched.filter((t) => t.status === "cancelled");
   }

   // Lọc theo thời gian
   const now = new Date();
   fetched = fetched.filter((t) => {
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);

    if (activeView === "upcoming") return start > now;
    if (activeView === "ongoing") return start <= now && end >= now;
    if (activeView === "past") return end < now;
    return true;
   });

   // GOM NHÓM THEO orderId
   const grouped = Object.values(
    fetched.reduce((acc, t) => {
     const key = t.order_code;
     if (!acc[key]) acc[key] = { ...t };
     return acc;
    }, {})
   );

   setTickets(grouped);
  } catch (err) {
   console.error("❌ Lỗi tải vé:", err);
  } finally {
   setLoading(false);
  }
 }, [userId, activeTab, activeView]); 

 // 2. useEffect để tải vé ban đầu và khi filters thay đổi
 useEffect(() => {
  console.log(`Tải vé: UserID=${userId}, Tab=${activeTab}, View=${activeView}`);
  fetchAndFilterTickets();
 }, [userId, activeTab, activeView, fetchAndFilterTickets]);

 // 3. useEffect để xử lý Socket.io
 useEffect(() => {
  if (!userId) return;

  const socketUrl =
   import.meta.env.VITE_SOCKET_URL || "http://localhost:9999";
  const socket = io(socketUrl, {
   transports: ["websocket"],
   withCredentials: true,
  });

  socket.on("connect", () => {
   console.log("✅ Connected to socket for ticket updates");
   socket.emit("join_user_room", userId);
  });

  
  socket.on("order_created_or_paid", (data) => {
   console.log("⭐ New order/payment received:", data);
   alert(
    `Đơn hàng mới thanh toán thành công! ID: ${data.orderId}. Đang cập nhật vé...`
   );
   fetchAndFilterTickets(); 
  });

 
  socket.on("event_status_changed", (data) => {
   console.log("📢 Event status changed for ticket screen:", data);
   fetchAndFilterTickets();
  });

  return () => {
   socket.disconnect();
  };
 }, [userId, fetchAndFilterTickets]); 

 return (
  <div>
   <Header />
   <div className="mt-app">
    <Sidebar />

    <div className="mt-main-content">
     {/* Breadcrumb */}
     <div className="mt-breadcrumb">
      <a href="#" className="mt-breadcrumb-link">
       Trang chủ
      </a>
      <span className="mt-breadcrumb-separator">›</span>
      <span className="mt-breadcrumb-current">Vé của tôi</span>
     </div>

     <h1 className="mt-page-title">Vé của tôi</h1>

     {/* Tabs lọc trạng thái */}
     <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} />

     {/* Tabs lọc thời gian */}
     <div className="mt-view-tabs">
      <button
       className={`mt-view-tab ${
        activeView === "upcoming" ? "mt-view-tab-active" : ""
       }`}
       onClick={() => setActiveView("upcoming")}
      >
       Sắp diễn ra
      </button>

      <button
       className={`mt-view-tab ${
        activeView === "ongoing" ? "mt-view-tab-active" : ""
       }`}
       onClick={() => setActiveView("ongoing")}
      >
       Đang diễn ra
      </button>

      <button
       className={`mt-view-tab ${
        activeView === "past" ? "mt-view-tab-active" : ""
       }`}
       onClick={() => setActiveView("past")}
      >
       Đã kết thúc
      </button>
     </div>

     {/* Hiển thị danh sách vé */}
     <div className="mt-tickets-list">
      {loading ? (
       <div className="mt-loading">
        <div className="mt-spinner"></div>
        <p>Đang tải vé của bạn...</p>
       </div>
      ) : tickets.length > 0 ? (
       tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
       ))
      ) : (
       <p className="mt-empty-message">Không có vé phù hợp.</p>
      )}
     </div>
    </div>
   </div>
   <Footer />
  </div>
 );
}

export default App;