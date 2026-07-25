// Sidebar.jsx
import "./Sidebar.css";
import axios from "axios";
import { useEffect, useState } from "react";
import { useStore } from "../../../hooks/useStore.jsx"; 
const promoData = {
  logo: "ticketbox",
  header: '"Khót gióng" show hót',
  title: "Nhận mã",
  subtitle: "cùng FU-Event",
  badges: [
    { text: "Giảm 20K", sub: "cho đơn từ 200K" },
    { text: "Giảm 50K", sub: "cho đơn từ 500K" },
  ],
  buttonText: "Dùng mã ngay",
};

function Sidebar({ id, discount, setDiscount }) {
  const [promoData2, setPromoData] = useState([]);
  const [status, setStatus] = useState("");
  const store = useStore();
  const user = store?.dataUser || {};
  const userId = user?.id || null;
  useEffect(() => {
    if (id) {
      setPromoData([]); // reset khi id đổi
      setStatus("");
      axios
        .get(`http://localhost:9999/api/users/discounts/${id}`)
        .then((res) => {
          if (res.data.success) {
            const data = Array.isArray(res.data.data)
              ? res.data.data
              : res.data.data
              ? [res.data.data]
              : [];

            // chuẩn hóa dữ liệu để tránh lỗi undefined
            const normalized = data.map((d) => ({
              ...d,
              usedUsers: d.usedUsers || [],
              maxUsers: d.maxUsers || 0,
            }));

            setPromoData(normalized);
          }
        })
        .catch((err) => {
          // Silently handle 404 or other errors - just don't show discounts
          if (err.response?.status !== 404) {
            console.error("Error fetching discounts:", err);
          }
          setPromoData([]);
        });
    }
  }, [id]);

  return (
    <div className="sidebar">
      {promoData2.map((item) => {
        const isFull = (item.usedUsers?.length || 0) >= (item.maxUsers || 0);

        return (
          <div className="promo-card" key={item.id}>
            <div className="promo-header">
              <div className="ticketbox-logo">FU-Event</div>
            </div>
            <div className="promo-content">
              <h3>{item.description}</h3>
              <h2 className="promo-title">Nhận mã {item.code}</h2>
              <h2 className="promo-subtitle">{promoData.subtitle}</h2>

              <div className="discount-badges">
                <div className="badge">
                  <span className="badge-text">Giảm {item.percentage}%</span>
                  <span className="badge-sub">cho người dùng nhanh tay</span>
                </div>
              </div>

              {isFull ? (
                <button className="promo-button" disabled>
                  Hết voucher
                </button>
              ) : status === item.id ? (
                <button
                  className="promo-button"
                  onClick={() => {
                    setDiscount({});
                    setStatus("");
                  }}
                >
                  Đang sử dụng
                </button>
              ) : (
                <button
                  className="promo-button"
                  onClick={async () => {
                    try {
                      const res = await axios.put(
                        `http://localhost:9999/api/use/discounts/${item.id}`,
                        { userId: userId }
                      );
                      if (res.data.success) {
                        setDiscount(item);
                        setStatus(item.id);

                        // cập nhật lại data sau khi dùng
                        const updated = promoData2.map((d) =>
                          d.id === item.id
                            ? {
                                ...res.data.data,
                                usedUsers: res.data.data.usedUsers || [],
                                maxUsers: res.data.data.maxUsers || 0,
                              }
                            : d
                        );
                        setPromoData(updated);

                        if (res.data.alreadyUsed) {
                          console.log(
                            "User đã từng dùng voucher này trước đó"
                          );
                        }
                      } else {
                        alert(res.data.message);
                      }
                    } catch (err) {
                      console.error(err);
                      alert("Có lỗi xảy ra");
                    }
                  }}
                >
                  {promoData.buttonText}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Sidebar;
