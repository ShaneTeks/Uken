import React, { useEffect } from 'react';
import Navbar from './components/Navbar.tsx';
import { useBackground } from '../../contexts/BackgroundContext.tsx';

const PAGE_KEY = "home"; // Unique key for this page's background

const HomePage: React.FC = () => {
  const { backgrounds, isLoading: isLoadingBackgrounds } = useBackground();

  useEffect(() => {
    const bgImage = backgrounds[PAGE_KEY] || backgrounds['global']; // Fallback to global if page-specific not set
    
    document.body.style.backgroundImage = bgImage ? `url(${bgImage})` : '';
    document.body.style.backgroundSize = bgImage ? 'cover' : '';
    document.body.style.backgroundPosition = bgImage ? 'center center' : '';
    document.body.style.backgroundRepeat = bgImage ? 'no-repeat' : '';
    document.body.style.backgroundAttachment = bgImage ? 'fixed' : ''; // Optional: for fixed background

    return () => {
      // Reset body styles on component unmount if this page was the one setting them.
      // This simple reset might need more sophisticated logic if multiple components
      // could set body backgrounds. For now, assume this component "owns" the body background.
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    };
  }, [backgrounds]);

  return (
    <div className="flex flex-col min-h-screen bg-transparent"> {/* Changed bg-gray-50 to bg-transparent */}
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Add a semi-transparent overlay if a background image is set, to ensure text readability */}
        <div className={`p-6 rounded-lg shadow ${backgrounds[PAGE_KEY] || backgrounds['global'] ? 'bg-white/80 backdrop-blur-sm' : 'bg-white'}`}>
          <h1 className="text-3xl font-bold text-gray-800">Welcome to AnimAI Home</h1>
          <p className="mt-4 text-gray-600">This is the Home page. Content will be added here.</p>
           {isLoadingBackgrounds && <p className="text-sm text-gray-500 mt-2">Loading background...</p>}
        </div>
      </main>
    </div>
  );
};

export default HomePage;