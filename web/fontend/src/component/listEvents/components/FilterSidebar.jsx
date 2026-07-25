import React from "react";
import "./FilterSidebar.css";
import { priceRanges } from "../constants"; // chỉnh path cho đúng

function FilterSidebar({
  isOpen,
  onClose,
  filters,
  setFilters,
  onApply,
  onClear,
}) {
  const categories = [
    "All",
    "Academic",
    "Music",
    "Workshop",
    "Club",
    "Sports",
    "Career",
    "Festival",
    "Technology",
    "Other",
  ];

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  return (
    <>
      {isOpen && <div className="overlay" onClick={onClose}></div>}

      <div className={`filter-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3>Filters</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        {/* Categories */}
        <div className="filter-section">
          <h4>Categories</h4>
          <div>
            {categories.map((cat) => (
              <label key={cat} className="radio-label">
                <input
                  type="radio"
                  name="category"
                  value={cat.toLowerCase()}
                  checked={filters.category === cat.toLowerCase()}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="filter-section">
          <h4>Price Range</h4>
          <div>
            {priceRanges.map((price) => (
              <label key={price.label} className="radio-label">
                <input
                  type="radio"
                  name="price"
                  value={price.label}
                  checked={filters.price === price.label}
                  onChange={(e) => handleFilterChange("price", e.target.value)}
                />
                {price.label}
              </label>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="filter-section">
          <h4>Location</h4>
          <select
            value={filters.location}
            onChange={(e) => handleFilterChange("location", e.target.value)}
          >
            <option value="all">All Locations</option>
            <option value="FPT University Hanoi Campus">
              FPT University Hanoi Campus
            </option>
            <option value="FPT University HoChiMinh Campus">
              FPT University HoChiMinh Campus
            </option>
            <option value="FPT University DaNang Campus">
              FPT University DaNang Campus
            </option>
            <option value="FPT University CanTho Campus">
              FPT University CanTho Campus
            </option>
            <option value="FPT University QuyNhon Campus">
              FPT University QuyNhon Campus
            </option>
          </select>
        </div>

        {/* Date range */}
        <div className="filter-section">
          <h4>Date Range</h4>
          <div className="date-range">
            <div className="date-input-group">
              <label>From</label>
              <input
                type="date"
                value={filters.from || ""}
                onChange={(e) => handleFilterChange("from", e.target.value)}
              />
            </div>
            <div className="date-input-group">
              <label>To</label>
              <input
                type="date"
                value={filters.to || ""}
                onChange={(e) => handleFilterChange("to", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="filter-actions">
          <button
            className="apply-btn"
            onClick={() => {
              onApply(filters);
              onClose();
            }}
          >
            Apply Filters
          </button>
          <button className="clear-btn" onClick={onClear}>
            Clear All
          </button>
        </div>
      </div>
    </>
  );
}

export default FilterSidebar;
