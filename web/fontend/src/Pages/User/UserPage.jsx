import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import request from '../../config/request';
import './userPage.scss';
import { MapPin, Calendar, Tag } from 'lucide-react';
import Header from "../../component/heroComponent/Header";
import Footer from "../../component/heroComponent/Footer";
import Banner from "../../component/heroComponent/Banner";
import Categories from "../../component/heroComponent/Categories";
import TrendingEvents from "../../component/heroComponent/TrendingEvents";
import EventCarousel from "../../component/heroComponent/EventCarousel";
import PopularEvents from "../../component/heroComponent/PopularEvents";

export default function UserPage() {
  const { id } = useParams();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const resUser = await request.get(`/api/users/${id}`);
        setUser(resUser.data || resUser);
        const resEvents = await request.get('/all-events');
        const myEvents = (resEvents.data || resEvents).filter(e => String(e.seller_id?._id || e.seller_id) === String(id));
        setEvents(myEvents);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="user-page-loading">Loading...</div>;
  }
  if (!user) {
    return <div className="user-page-error">User not found</div>;
  }

  const avatarUrl = user.avatar_url || user.avatar || `https://i.pravatar.cc/150?u=${user._id}`;

  return (
    <>
      <Header />
      <main>
        <Banner />
        
        <Categories
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        <TrendingEvents />
        <EventCarousel />

        <div className="user-events-section">
          <h2 className="section-title">Events Created</h2>
          {events.length === 0 ? (
            <p className="no-events-message">This user hasn't created any events yet.</p>
          ) : (
            <div className="event-grid">
              {events.map(event => (
                <Link to={`/event/${event._id}`} key={event._id} className="event-card">
                  <div className="event-card-banner">
                    <img src={event.banner_url || 'https://via.placeholder.com/400x200'} alt={event.title} />
                  </div>
                  <div className="event-card-content">
                    <h3 className="event-card-title">{event.title}</h3>
                    <div className="event-card-details">
                      <p><Calendar size={14} /> {new Date(event.start_time).toLocaleDateString()}</p>
                      <p><MapPin size={14} /> {event.location}</p>
                      <p><Tag size={14} /> {event.category?.name || 'General'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Popular Events Sections */}
        <section>
          <PopularEvents selectedCategory="Career" />
          <PopularEvents selectedCategory="Festival" />
        </section>
      </main>
      <Footer />
    </>
  );
}

