import React from 'react';
import './FilterTabs.css';

function FilterTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'paid', label: 'Thành công' },
    { id: 'cancelled', label: 'Đã hủy' },
  ];

  return (
    <div className="mt-filter-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`mt-tab ${activeTab === tab.id ? 'mt-tab-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default FilterTabs;
