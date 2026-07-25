import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../heroComponent/Header";
import SearchForm from "./components/SearchForm";
import EventCard from "./components/EventCard";
import FilterSidebar from "./components/FilterSidebar";
import "./App.css";
import Footer from "../heroComponent/Footer";
import axios from "axios";
import { priceRanges } from "./constants"; // chỉnh path cho đúng
import { matchLocation } from "../../lib/locationUtils";

function App() {
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Thêm state để kiểm soát việc hiển thị tóm tắt sau delay
  const [showSummary, setShowSummary] = useState(false);

  // lấy category từ navigate state (nếu có)
  const initialCategory = location.state?.category || "all";
  const initialLocation = location.state?.location || "all";
  const [tempFilters, setTempFilters] = useState({
    from: null,
    to: null,
    location: initialLocation,
    price: "all",
    category: initialCategory,
  });

  const [appliedFilters, setAppliedFilters] = useState(tempFilters);

  const [keyword, setKeyword] = useState("");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // 1. Reset showSummary khi bắt đầu fetch hoặc lọc mới
    setShowSummary(false);

    axios
      .get(`http://localhost:9999/api/binh/events/category?category=All`)
      .then((res) => {
        const allEvents = res.data.data || [];
        const lowerKeyword = keyword.toLowerCase();

        const filtered = allEvents.filter((event) => {
          const start = new Date(event.start_time); // ngày bắt đầu
          const end = new Date(event.end_time); // ngày kết thúc

          if (appliedFilters.from) {
            const fromDate = new Date(appliedFilters.from);
            if (end < fromDate) return false; // sự kiện kết thúc trước "from"
          }

          if (appliedFilters.to) {
            const toDate = new Date(appliedFilters.to);
            if (start > toDate) return false; // sự kiện bắt đầu sau "to"
          }
          if (appliedFilters.price !== "all") {
            const range = priceRanges.find(
              (p) => p.label === appliedFilters.price
            );
            const priceValue = Number(event.price);

            if (range) {
              if (range.min !== null && priceValue < range.min) return false;
              if (range.max !== null && priceValue > range.max) return false;
            }
          }

          if (
            appliedFilters.category.toLowerCase() !== "all" &&
            event.category.toLowerCase() !==
              appliedFilters.category.toLowerCase()
          ) {
            return false;
          }

          // Location filtering with flexible matching
          if (!matchLocation(event.location, appliedFilters.location)) {
            return false;
          }

          if (
            lowerKeyword &&
            !event.title.toLowerCase().includes(lowerKeyword) &&
            !event.artist.toLowerCase().includes(lowerKeyword)
          ) {
            return false;
          }

          return true;
        });

        setEvents(filtered);

        // 2. Bắt đầu timer 500ms sau khi dữ liệu đã được tính toán
        const timer = setTimeout(() => {
          setShowSummary(true);
        }, 500);

        // Cleanup function: Xóa timer nếu component unmount hoặc effect chạy lại
        return () => clearTimeout(timer);
      })
      .catch((err) => console.error(err));
  }, [appliedFilters, keyword]);

  // Hàm render tóm tắt kết quả
  const renderSummary = () => {
    if (!showSummary) {
      return <p className="text-gray-500">Loading summary...</p>;
    }
    
    return (
      <p>
        {events.length} events found{" "}
        {appliedFilters.from && `from ${appliedFilters.from}`}{" "}
        {appliedFilters.to && `to ${appliedFilters.to}`}{" "}
        {appliedFilters.location !== "all" &&
          `in ${appliedFilters.location}`}{" "}
        {appliedFilters.category !== "all" &&
          `category: ${appliedFilters.category}`}
      </p>
    );
  };

  return (
    <div className="app-container">
      <Header />
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Discover Amazing Events</h1>
            <p>Find events happening in FPT University</p>
          </div>
        </div>
        <div>
          <SearchForm keyword={keyword} setKeyword={setKeyword} />
        </div>
      </div>

      <div className="main-content">
        <div className="content-layout">
          <div className="events-section">
            <div className="results-header">
              <div>
                <h2>All Events</h2>
                {/* Sử dụng hàm renderSummary đã thêm delay */}
                {renderSummary()}
              </div>
              <button
                onClick={() => setSidebarOpen(true)}
                className="filter-btn"
              >
                Filters
              </button>
            </div>

            <div className="events-grid">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>

        <FilterSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          filters={tempFilters}
          setFilters={setTempFilters}
          onApply={(newFilters) => {
            setAppliedFilters(newFilters);
            setSidebarOpen(false);
          }}
          onClear={() => {
            const reset = {
              from: null,
              to: null,
              location: "all",
              price: "all", // reset về all
              category: "all",
            };

            setTempFilters(reset);
            setAppliedFilters(reset);
            setKeyword("");
          }}
        />
      </div>
      <Footer />
    </div>
  );
}

export default App;