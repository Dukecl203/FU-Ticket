import React from "react";
import { Search } from "lucide-react";
import "./SearchForm.css";

const SearchForm = ({ keyword, setKeyword }) => {
  return (
    <div className="search-form">
      {/* Search Bar */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search events, artists, venues..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)} // realtime
            className="input search-input"
          />
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
