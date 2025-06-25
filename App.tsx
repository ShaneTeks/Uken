import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage.tsx';
import CreatePage from './pages/CreatePage/CreatePage.tsx'; // Ensure default import
import CharactersPage from './pages/CharactersPage/CharactersPage.tsx';
import BackgroundsPage from './pages/BackgroundsPage/BackgroundsPage.tsx';
import PricingPage from './pages/PricingPage/PricingPage.tsx';
import { BackgroundProvider } from './contexts/BackgroundContext.tsx';

const App: React.FC = () => {
  return (
    <BackgroundProvider>
      <HashRouter>
        {/* Navbar and global layout structure removed from here */}
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/backgrounds" element={<BackgroundsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </HashRouter>
    </BackgroundProvider>
  );
};

export default App;