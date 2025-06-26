
import React from 'react';
import { NavLink } from 'react-router-dom';
import { DiamondIcon } from './icons/DiamondIcon';
import { HelpIcon } from './icons/HelpIcon';

interface NavItemProps {
  to: string;
  children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, children }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out ${
          isActive
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-100'
        }`
      }
    >
      {children}
    </NavLink>
  );
};

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/home" className="flex-shrink-0 flex items-center group">
              <DiamondIcon className="h-8 w-8 text-indigo-600 group-hover:text-indigo-700 transition-colors" />
              <span className="ml-2 text-xl font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">AnimAI</span>
            </NavLink>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <NavItem to="/home">Home</NavItem>
            <NavItem to="/create">Create</NavItem>
            <NavItem to="/characters">Characters</NavItem>
            <NavItem to="/backgrounds">Backgrounds</NavItem>
            <NavItem to="/pricing">Pricing</NavItem>
          </div>
          <div className="flex items-center space-x-4">
            <button
              aria-label="Help"
              className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <HelpIcon className="h-6 w-6" />
            </button>
            <button
              aria-label="User profile"
              className="p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
      {/* Mobile menu (optional, can be expanded later) */}
      {/* <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <NavItem to="/home">Home</NavItem>
          <NavItem to="/create">Create</NavItem>
          ...
        </div>
      </div> */}
    </nav>
  );
};

export default Navbar;
    