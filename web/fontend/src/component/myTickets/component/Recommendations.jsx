import React from 'react';
import './Recommendations.css';

function Recommendations() {
  const recommendations = [
    {
      id: 1,
      image: 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=600',
      title: 'VÉ/COMBO THAM QUAN KHU DU LỊCH VĂN HÓA SUỐI TIÊN',
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/5198239/pexels-photo-5198239.jpeg?auto=compress&cs=tinysrgb&w=600',
      title: '[LEMLAB] Mini Workshop VẼ MÓC KHÓA',
    },
    {
      id: 3,
      image: 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=600',
      title: "[FLOWER 1969's] REED DIFFUSER WORKSHOP - TINH DẦU KHUẾCH TÁN",
    },
    {
      id: 4,
      image: 'https://images.pexels.com/photos/1833399/pexels-photo-1833399.jpeg?auto=compress&cs=tinysrgb&w=600',
      title: "(FLOWER 1969's) WORKSHOP CANDLE - HỌC LÀM NẾN THƠM",
    },
  ];

  return (
    <div className="mt-recommendations">
      <h2 className="mt-recommendations-title">Có thể bạn cũng thích</h2>
      <div className="mt-recommendations-grid">
        {recommendations.map((item) => (
          <div key={item.id} className="mt-recommendation-card">
            <img
              src={item.image}
              alt={item.title}
              className="mt-recommendation-image"
            />
            <h3 className="mt-recommendation-title">{item.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Recommendations;
