import { useState } from 'react'
import './buyP.css'
import TicketBooking from './component/TicketBooking'
import Footer from '../heroComponent/Footer'
import Header from '../heroComponent/Header'

function App() {
  return (
    <div className="bp-app">
        <Header />
      <TicketBooking />
      <Footer/>
    </div>
  )
}

export default App
