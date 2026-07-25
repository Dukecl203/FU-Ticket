import React, { useState, useEffect } from "react";
import Header from "./Header";
import Banner from "./Banner";
import Categories from "./Categories";
import PopularEvents from "./PopularEvents";
import "./App.css";
import Footer from "./Footer";
import TrendingEvents from "./TrendingEvents";
import EventCarousel from "./EventCarousel";
import InterestingDestinations from "./InterestingDestinations";

function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  return (
    <div>
      
      <main>
        <Banner />
        <Categories 
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <TrendingEvents />
        <EventCarousel />

        <PopularEvents selectedCategory={"Career"} />
        <PopularEvents selectedCategory={"Festival"} />
        <InterestingDestinations/>
      </main>
     
    </div>
  );
}

export default Home;
