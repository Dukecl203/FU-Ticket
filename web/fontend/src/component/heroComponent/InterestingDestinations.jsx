import React from "react";
import { useNavigate } from "react-router-dom";
import "./InterestingDestinations.css";

const destinations = [
  {
    name: "FPT University Hanoi Campus",
    img: "https://cdnphoto.dantri.com.vn/X2770V8G-b149OhGhotqbyIut98=/zoom/1200_630/2021/01/31/czxczczcz-1612100910190.png",
  },
  {
    name: "FPT University HoChiMinh Campus",
    img: "https://danviet.ex-cdn.com/resize/800x450/files/f1/296231569849192448/2024/6/21/z5559680242856-3337fa5b43fa5040f7247b7ef8981225-17189427468891721984216-0-0-394-630-crop-1718942749219529893143.jpg",
  },
  {
    name: "FPT University DaNang Campus",
    img: "https://fptcity.vn/wp-content/uploads/truong-fpt-university.jpg",
  },
  {
    name: "FPT University CanTho Campus",
    img: "https://i.ytimg.com/vi/VF_oRgoDtRU/maxresdefault.jpg",
  },
  {
    name: "FPT University QuyNhon Campus",
    img: "https://toplistgialai.com/wp-content/uploads/2023/07/dai-hoc-fpt-quy-nhon-768x408.jpg",
  },
];

export default function InterestingDestinations() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <section className="destinations">
        <h2 className="destinations-title">Điểm đến thú vị</h2>
        <div className="destinations-grid">
          {destinations.map((item, index) => (
            <div
              title={`filter_location ${item.name}`}
              key={index}
              className="destination-card"
              onClick={() =>
                navigate("/events", { state: { location: item.name } })
              }
              style={{ cursor: "pointer" }}
            >
              <img src={item.img} alt={item.name} className="destination-img" />
              <div className="destination-overlay">
                <h3 className="destination-name">{item.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
