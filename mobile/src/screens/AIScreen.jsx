import React, { useState } from "react";
import { SafeAreaView } from "react-native";
import EventSuggestions from "./card/EventSuggestions";
import EventList from "./card/EventList";

export default function AIScreen() {
  const [activeView, setActiveView] = useState("create");
  const [formData, setFormData] = useState(null);

  const handleInputSuccess = (data) => {
    setFormData(data);
    setActiveView("suggestions");
  };

  const handleReset = () => {
    setFormData(null);
    setActiveView("create");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {activeView === "create" && (
        <EventSuggestions onInputSuccess={handleInputSuccess} />
      )}
      {activeView === "suggestions" && formData && (
        <EventList formData={formData} onReset={handleReset} />
      )}
    </SafeAreaView>
  );
}
