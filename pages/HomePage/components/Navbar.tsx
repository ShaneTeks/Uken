import React, { useState, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { DiamondIcon } from './icons/DiamondIcon.tsx';
import { FiSettings } from 'react-icons/fi'; 
import { SettingsModal } from '../../../components/SettingsModal.tsx';

interface NavItemProps {
  to: string;
  children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, children }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded-md text-sm transition-colors duration-150 ease-in-out font-semibold ${
          isActive
            ? 'text-stone-800 bg-stone-100' 
            : 'text-stone-700 hover:text-stone-900 hover:bg-stone-50'
        }`
      }
    >
      {children}
    </NavLink>
  );
};

const Navbar: React.FC = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const openSettingsModal = () => setShowSettingsModal(true);
  const closeSettingsModal = useCallback(() => setShowSettingsModal(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSettingsModal();
      }
    };
    if (showSettingsModal) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSettingsModal, closeSettingsModal]);

  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <NavLink to="/home" className="flex-shrink-0 flex items-center group">
                <DiamondIcon className="h-8 w-8 text-stone-700 group-hover:text-stone-900 transition-colors" />
                <span className="ml-2 text-xl font-semibold text-stone-800 group-hover:text-stone-900 transition-colors">AnimAI</span>
              </NavLink>
            </div>
            <div className="flex items-center space-x-4">
              <NavItem to="/home">Home</NavItem>
              <NavItem to="/create">Create</NavItem>
              <NavItem to="/characters">Characters</NavItem>
              <NavItem to="/backgrounds">Backgrounds</NavItem>
              <NavItem to="/pricing">Pricing</NavItem>
            </div>
            <div className="flex items-center space-x-4">
              <button
                aria-label="Settings" 
                onClick={openSettingsModal} 
                className="p-1 rounded-full text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-stone-500 transition-colors shadow-sm"
              >
                <FiSettings className="h-6 w-6" /> 
              </button>
              <button
                aria-label="User profile"
                className="p-1 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-stone-500 shadow-sm hover:bg-gray-100"
              >
                <img
                  className="h-8 w-8 rounded-full object-cover"
                  src="https://picsum.photos/seed/useravatar/40/40" 
                  alt="User avatar"
                />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={closeSettingsModal}
      />
    </>
  );
};

export default Navbar;