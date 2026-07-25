import { useState } from "react";
import "./App.css";
import VerifyTicket from "./component/VerifyTicket";
import ScanTicket from "./component/ScanTicket";
import Header from "../heroComponent/Header";
import Footer from "../heroComponent/Footer";

function App() {
  const [activeView, setActiveView] = useState("create");
  const [scannedTicket, setScannedTicket] = useState(null);

  // Nhận kết quả quét từ CreateTicket (khi có QR hoặc nhập thủ công)
  const handleScanSuccess = (ticketNumber) => {
    setScannedTicket(ticketNumber);
    setActiveView("verify");
  };

  const handleResetScan = () => {
    setScannedTicket(null);
    setActiveView("create");
  };

  return (
    <div>
      <Header/>
    <div className="ci-app">
      <header className="ci-app-header">
        <h1>🎟 QR Ticket System</h1>
      </header>

      <main className="ci-app-content">
        {activeView === "create" && (
          <ScanTicket onScanSuccess={handleScanSuccess} />
        )}

        {activeView === "verify" && scannedTicket && (
          <VerifyTicket
            ticketNumber={scannedTicket}
            onReset={handleResetScan}
          />
        )}
      </main>
    </div>
    <Footer/>
    </div>
  );
}

export default App;
