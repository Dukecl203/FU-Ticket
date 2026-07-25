import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { io } from "socket.io-client";
const SOCKET_SERVER_URL = "http://localhost:9999";
import {
  faEye,
  faEyeSlash,
  faUser,
  faTicket,
  faSignOutAlt,
  faClockRotateLeft,
  faMoneyBillTransfer,
} from "@fortawesome/free-solid-svg-icons";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../store/authSlice";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../../component/heroComponent/Header";
import Footer from "../../component/heroComponent/Footer";
import "./profile.css";

const Profile = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile");
  const [tickets, setTickets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);

  const [fullName, setFullName] = useState(
    user?.full_name || user?.fullName || ""
  );
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'tickets', 'wallet', 'transactions'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);
  
  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    const socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"], // Tùy chọn
    });

    console.log("Connecting socket...");

    socket.on("connect", () => {
      console.log(
        `Socket connected: ${socket.id}. Joining user room: ${user.id}`
      );

      socket.emit("join_user_room", user.id); // 💡 Sự kiện mới (cần định nghĩa ở Server)
    });

    socket.on("wallet_updated", (data) => {
      setWallet((prevWallet) => ({
        ...prevWallet,
        balance: data.newBalance,
      }));
      if (activeTab === "transactions") {
        fetchTransactions();
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
    return () => {
      console.log("Disconnecting socket...");
      socket.off("wallet_updated");
      socket.disconnect();
    };
  }, [user, navigate, activeTab]); // Thêm activeTab vào dependency array để re-check khi chuyển tab

  const fetchUserTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:9999/api/orders/user/${user.id}`
      );
      setTickets(response.data.orders || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchWallet = async () => {
    try {
      setWalletLoading(true);
      const response = await axios.get(
        `http://localhost:9999/api/user/wallet/${user.id}`
      );
      setWallet(response.data.wallet || null);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setWalletLoading(false);
    }
  };
  useEffect(() => {
    if (activeTab === "wallet") {
      fetchWallet();
    }
  }, [activeTab]);

  const fetchTransactions = async () => {
    try {
      setTransactionLoading(true);
      const response = await axios.get(
        `http://localhost:9999/api/user/transactions/history/${user.id}`
      );
      setTransactions(response.data.histories || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setTransactionLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions();
    }
  }, [activeTab]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/signin");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`http://localhost:9999/api/users/${user.id}`, {
        full_name: fullName,
        phone_number: phone,
      });
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };
  const handleWithdraw = async () => {
    if (withdrawAmount <= 0) {
      return alert("Vui lòng nhập số tiền rút hợp lệ!");
    }
    if (!accountNumber || !bankName) {
      return alert("Vui lòng nhập đầy đủ thông tin tài khoản nhận tiền!");
    }
    if (wallet && withdrawAmount > wallet.balance) {
      return alert("Số dư ví không đủ để rút tiền!");
    }

    setIsWithdrawing(true);
    try {
      const response = await axios.post(
        "http://localhost:9999/api/user/wallet/withdraw",
        {
          userId: user.id,
          amount: withdrawAmount,
          accountNumber: accountNumber,
          bankName: bankName,
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        setWallet({ ...wallet, balance: response.data.newBalance });
        setShowWithdrawModal(false);
        setWithdrawAmount(0);
        setAccountNumber("");
        setBankName("");
        setActiveTab("transactions");
      } else {
        alert(response.data.message || "Lỗi rút tiền!");
      }
    } catch (error) {
      console.error("Error withdrawing:", error.response?.data || error);
      alert(error.response?.data?.message || "Lỗi kết nối hoặc hệ thống!");
    } finally {
      setIsWithdrawing(false);
    }
  };
  return (
    <div className="profile-page-container">
      <Header />
      <div className="profile-page-layout">
        {/* Sidebar */}
        <div className="profile-sidebar">
          <div className="profile-avatar">
            <FontAwesomeIcon icon={faUser} size="3x" />
            <h3>{user?.full_name || user?.fullName || "User"}</h3>
            <p>{user?.email}</p>
          </div>

          <nav className="profile-nav">
            <button
              className={`profile-nav-item ${
                activeTab === "profile" ? "active" : ""
              }`}
              onClick={() => setActiveTab("profile")}
            >
              <FontAwesomeIcon icon={faUser} /> Thông tin cá nhân
            </button>
            <button
              className={`profile-nav-item ${
                activeTab === "tickets" ? "active" : ""
              }`}
              onClick={() => navigate("/profile/tickets")}
            >
              <FontAwesomeIcon icon={faTicket} /> Vé của tôi
            </button>
            <button
              className={`profile-nav-item ${
                activeTab === "wallet" ? "active" : ""
              }`}
              onClick={() => setActiveTab("wallet")}
            >
              <FontAwesomeIcon icon={faMoneyBillTransfer} /> Ví của tôi
            </button>

            <button
              className={`profile-nav-item ${
                activeTab === "transactions" ? "active" : ""
              }`}
              onClick={() => setActiveTab("transactions")}
            >
              <FontAwesomeIcon icon={faClockRotateLeft} /> Lịch sử giao dịch
            </button>
            <button className="profile-nav-item logout" onClick={handleLogout}>
              <FontAwesomeIcon icon={faSignOutAlt} /> Đăng xuất
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="profile-main-content">
          {activeTab === "profile" && (
            <>
              <h1 className="profile-page-title">Thông tin cá nhân</h1>
              {/* Form chỉnh sửa */}
              <form onSubmit={handleSaveProfile}>
                <div className="profile-section">
                  <h2 className="profile-section-title">Thông tin tài khoản</h2>
                  {/* Họ tên */}
                  <div className="profile-form-row">
                    <label>Họ và tên</label>
                    {editing ? (
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    ) : (
                      <p>{fullName || "Chưa cập nhật"}</p>
                    )}
                  </div>
                  {/* Email */}
                  <div className="profile-form-row">
                    <label>Email</label>
                    {editing ? (
                      <input type="email" value={email} disabled required />
                    ) : (
                      <p>{email}</p>
                    )}
                  </div>
                  {/* Số điện thoại */}
                  <div className="profile-form-row">
                    <label>Số điện thoại</label>
                    {editing ? (
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    ) : (
                      <p>{phone || "Chưa cập nhật"}</p>
                    )}
                  </div>
                </div>
                {editing && (
                  <div className="profile-form-actions">
                    <button
                      type="submit"
                      className="profile-button primary"
                      disabled={saving}
                    >
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                    <button
                      type="button"
                      className="profile-button secondary"
                      onClick={() => setEditing(false)}
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </form>

              {!editing && (
                <div className="profile-actions">
                  <button
                    className="profile-button primary"
                    onClick={() => setEditing(true)}
                  >
                    Chỉnh sửa thông tin
                  </button>
                </div>
              )}
            </>
          )}
          {activeTab === "wallet" && (
            <div className="wallet-container">
              <h1 className="profile-page-title">Ví của tôi</h1>

              <div className="wallet-balance-card">
                <h2>Số dư hiện tại</h2>
                <p className="wallet-balance">
                  {wallet?.balance?.toLocaleString()} VNĐ
                </p>
              </div>

              <div className="wallet-actions">
                {" "}
                <button
                  className="wallet-btn deposit"
                  onClick={() => setShowTopupModal(true)}
                >
                  Nạp tiền{" "}
                </button>{" "}
                <button
                  className="wallet-btn withdraw"
                  onClick={() => setShowWithdrawModal(true)}
                >
                  Rút tiền{" "}
                </button>{" "}
              </div>
            </div>
          )}
          {activeTab === "transactions" && (
            <div className="transactions-container">
              <h1 className="profile-page-title">Lịch sử giao dịch</h1>

              {transactionLoading ? (
                <p className="loading-text">Đang tải lịch sử giao dịch...</p>
              ) : transactions.length === 0 ? (
                <p className="no-transactions">Chưa có giao dịch nào.</p>
              ) : (
                <div className="transaction-list">
                  {transactions.map((t) => (
                    <div className="transaction-card" key={t._id}>
                      <div className="trans-left">
                        <h4 className="trans-desc">{t.description}</h4>
                        <p className="trans-date">
                          {new Date(t.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="trans-right">
                        {t.amount_add > 0 ? (
                          <p className="trans-amount add">
                            +{t.amount_add.toLocaleString()} đ
                          </p>
                        ) : (
                          <p className="trans-amount subtract">
                            -{t.amount_subtract.toLocaleString()} đ
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {showTopupModal && (
          <div className="topup-overlay">
            <div className="topup-container">
              <h2 className="topup-title">Nạp tiền vào ví</h2>

              <input
                type="number"
                className="topup-input"
                placeholder="Nhập số tiền..."
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
              />

              <div className="button-group">
                <button
                  className="btn-momo"
                  onClick={async () => {
                    if (topupAmount <= 0)
                      return alert("Vui lòng nhập số tiền hợp lệ!");

                    try {
                      const res = await fetch(
                        "http://localhost:9999/api/payment/momo/topup",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            amount: topupAmount,
                            userId: user.id,
                          }),
                        }
                      );

                      const data = await res.json();
                      if (!data.success)
                        return alert("Lỗi tạo giao dịch MoMo!");

                      window.location.href = data.payUrl; // ← Redirect người dùng sang MoMo
                    } catch (err) {
                      console.error(err);
                      alert("Không thể kết nối MoMo!");
                    }
                  }}
                >
                  Thanh toán MoMo
                </button>

                <button
                  className="btn-cancel"
                  onClick={() => setShowTopupModal(false)}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showWithdrawModal && (
        <div className="topup-overlay">
          <div className="topup-container">
            <h2 className="topup-title">Rút tiền từ ví</h2>

            <input
              type="number"
              className="topup-input"
              placeholder="Nhập số tiền muốn rút..."
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              min="1000"
            />
            <input
              type="text"
              className="topup-input"
              placeholder="Tên ngân hàng"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              style={{ marginTop: "10px" }}
              required
            />
            <input
              type="text"
              className="topup-input"
              placeholder="Số tài khoản/Ví điện tử nhận"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              style={{ marginTop: "10px" }}
              required
            />

            <div className="button-group">
              <button
                className="btn-momo" // Dùng chung class style
                onClick={handleWithdraw}
                disabled={isWithdrawing || withdrawAmount <= 0}
              >
                {isWithdrawing ? "Đang xử lý..." : "Xác nhận Rút tiền"}
              </button>

              <button
                className="btn-cancel"
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount(0); // Reset state khi hủy
                  setAccountNumber("");
                  setBankName("");
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default Profile;
