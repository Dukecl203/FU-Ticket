import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./CreateTicket.css";

export default function ScanTicket({ onScanSuccess }) {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState("");
  const [scanResult, setScanResult] = useState(null);

  // 🟢 Lấy dữ liệu sự kiện thật
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axios.get(`http://localhost:9999/api/binh/events/${eventId}`);
        setEvent(res.data.data);
      } catch (err) {
        console.error("❌ Lỗi khi lấy event:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  // 🟢 Khởi tạo scanner QR
  useEffect(() => {
    let scanner = null;

    if (scanning) {
      scanner = new Html5QrcodeScanner("ci-qr-reader", {
        qrbox: { width: 250, height: 250 },
        fps: 5,
      });

      scanner.render(
        (decodedText) => {
          console.log("✅ QR detected:", decodedText);
          setScanResult(decodedText);
          setScanning(false);

          // ⏩ Gọi callback để chuyển sang VerifyTicket
          if (onScanSuccess) {
            onScanSuccess(decodedText.trim());
          }

          scanner.clear();
        },
        (error) => console.log("⚠️ Scanning error:", error)
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanning, onScanSuccess]);

  const handleStartScanning = () => {
    setScanResult(null);
    setScanning(true);
  };

  const handleStopScanning = () => {
    setScanning(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualEntry.trim()) {
      const value = manualEntry.trim();
      setScanResult(value);
      if (onScanSuccess) onScanSuccess(value); // chuyển luôn
      setManualEntry("");
    }
  };

  if (loading) return <div>⏳ Đang tải dữ liệu sự kiện...</div>;
  if (!event) return <div>⚠️ Không tìm thấy sự kiện.</div>;

  return (
    <div className="ci-ticket-container">
      {/* Banner sự kiện */}
      <div className="ci-ticket-card">
        <div className="ci-event-banner">
          <img src={event.image || "https://placehold.co/600x300"} alt={event.title} />
          <div className="ci-event-banner-overlay">
            <h1 className="ci-event-title">{event.title}</h1>
          </div>
        </div>
      </div>

      {/* Khu vực quét vé */}
      <div className="ci-ticket-info">
        <h2 className="ci-title">🎟 Quét vé cho sự kiện: {event.title}</h2>
        <p className="ci-subtitle">📍 {event.location}</p>

        {!scanning ? (
          <div className="ci-scan-options">
            <button onClick={handleStartScanning} className="ci-btn-primary">
              Bắt đầu quét mã QR
            </button>

            
          </div>
        ) : (
          <div className="ci-scanner-container">
            <div id="ci-qr-reader"></div>
            <button onClick={handleStopScanning} className="ci-btn-secondary">
              Dừng quét
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
