import { useState } from "react";
import Header from "../heroComponent/Header";
import Footer from "../heroComponent/Footer";
import EventSuggestions from "./EventSuggestions";
import EventList from "./EventList";

function App() {
  const [activeView, setActiveView] = useState("create");
  const [formData, setFormData] = useState(null); // 👈 dữ liệu người nhập

  // Khi người dùng nhập xong và nhấn "Xem gợi ý"
  const handleInputSuccess = (data) => {
    setFormData(data); 
    setActiveView("suggestions"); 
  };

  // Khi người dùng muốn quay lại form
  const handleResetSuggest = () => {
    setFormData(null);
    setActiveView("create");
  };

  return (
    <div>
      <Header />
      <main className="ci-app-content">
        {activeView === "create" && (
          <EventSuggestions onInputSuccess={handleInputSuccess} />
        )}

        {activeView === "suggestions" && formData && (
          <EventList formData={formData} onReset={handleResetSuggest} />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
