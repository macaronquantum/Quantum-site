import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';

const Landing = lazy(() => import('./pages/Landing'));
const Presale = lazy(() => import('./pages/Presale'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Affiliation = lazy(() => import('./pages/Affiliation'));
const Opportunities = lazy(() => import('./pages/Opportunities'));
const Profile = lazy(() => import('./pages/Profile'));
const ConnectCallback = lazy(() => import('./pages/ConnectCallback'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-16">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/presale" element={<Presale />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/affiliation" element={<Affiliation />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/connect/:sid" element={<ConnectCallback />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
