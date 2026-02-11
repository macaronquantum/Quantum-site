import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Presale from './pages/Presale';
import Portfolio from './pages/Portfolio';
import Affiliation from './pages/Affiliation';
import Opportunities from './pages/Opportunities';
import Profile from './pages/Profile';

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/presale" element={<Presale />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/affiliation" element={<Affiliation />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}
