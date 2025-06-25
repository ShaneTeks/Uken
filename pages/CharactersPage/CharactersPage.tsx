import React, { useEffect } from 'react';
import Navbar from './components/Navbar.tsx';
import { useBackground } from '../../contexts/BackgroundContext.tsx';

const PAGE_KEY = "characters"; // Unique key for this page's background

const CharactersPage: React.FC = () => {
  const { backgrounds, isLoading: isLoadingBackgrounds } = useBackground();

  useEffect(() => {
    const bgImage = backgrounds[PAGE_KEY] || backgrounds['global'];
    document.body.style.backgroundImage = bgImage ? `url(${bgImage})` : '';
    document.body.style.backgroundSize = bgImage ? 'cover' : '';
    document.body.style.backgroundPosition = bgImage ? 'center center' : '';
    document.body.style.backgroundRepeat = bgImage ? 'no-repeat' : '';
    document.body.style.backgroundAttachment = bgImage ? 'fixed' : '';

    return () => {
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
        <div className={`p-6 rounded-lg shadow ${backgrounds[PAGE_KEY] || backgrounds['global'] ? 'bg-white/80 backdrop-blur-sm' : 'bg-white'}`}>
          <h1 className="text-3xl font-bold text-gray-800">Manage Characters</h1>
          <p className="mt-4 text-gray-600">This is the Characters page. Browse or create new characters.</p>
          {isLoadingBackgrounds && <p className="text-sm text-gray-500 mt-2">Loading background...</p>}
        </div>
      </main>
    </div>
  );
};

export default CharactersPage;