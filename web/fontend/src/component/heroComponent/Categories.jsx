import React from 'react'
import { Book, Music, Wrench, Users, Trophy, Briefcase, Gift, Cpu, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './Categories.css'

const Categories = () => {
  const navigate = useNavigate()

  const categories = [
    { name: 'All', icon: null, color: '#FF6B35', count: 48 },
    { name: 'Academic', icon: Book, color: '#4F46E5', count: 12 },
    { name: 'Music', icon: Music, color: '#EC4899', count: 8 },
    { name: 'Workshop', icon: Wrench, color: '#10B981', count: 15 },
    { name: 'Club', icon: Users, color: '#F59E0B', count: 7 },
    { name: 'Sports', icon: Trophy, color: '#EF4444', count: 6 },
    { name: 'Career', icon: Briefcase, color: '#10B981', count: 8 },
    { name: 'Festival', icon: Gift, color: '#F59E0B', count: 5 },
    { name: 'Technology', icon: Cpu, color: '#3B82F6', count: 20 },
    { name: 'Other', icon: MoreHorizontal, color: '#6B7280', count: 3 },
  ]

  return (
    <section className="categories section">
      <div className="container">
        <h2 className="section-title">Explore Events</h2>
        <div className="categories-grid">
          {categories.map((category) => {
            const IconComponent = category.icon
            return (
              <button
                key={category.name}
                className="category-card"
                onClick={() =>
                  navigate('/events', { state: { category: category.name } })
                }
                style={{ '--category-color': category.color }}
              >
                <div className="category-icon">
                  {IconComponent && <IconComponent size={28} />}
                  {!IconComponent && <span className="all-icon">All</span>}
                </div>
                <div className="category-info">
                  <h3 className="category-name">{category.name}</h3>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Categories
