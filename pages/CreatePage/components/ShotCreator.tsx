import React from 'react';
import LoadingScreen from './LoadingScreen';

interface ShotCreatorProps {
  isAnimating: boolean;
  onAnimate: () => void;
  imageUrl?: string;
}

const ShotCreator: React.FC<ShotCreatorProps> = ({ isAnimating, onAnimate, imageUrl }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Panel: Character and Location Selection */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                Choose Character
              </button>
              <div className="mt-2 bg-gray-900 aspect-square rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Character</span>
              </div>
            </div>
            <div>
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                Choose Location
              </button>
              <div className="mt-2 bg-gray-900 aspect-square rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Location</span>
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="blend-prompt" className="block text-sm font-medium text-gray-300">Blend Prompt</label>
            <input
              type="text"
              id="blend-prompt"
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="The character is walking in the location"
            />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
            Blend
          </button>
        </div>

        {/* Right Panel: Blended Image and Animation */}
        <div className="space-y-4">
          <div className="bg-gray-900 aspect-video rounded-lg flex items-center justify-center overflow-hidden">
            {isAnimating ? (
              <LoadingScreen imageUrl={imageUrl || 'https://placehold.co/1920x1080/4a2a6c/eae0d0?text=Source+Image'} />
            ) : (
              <span className="text-gray-500">Blended Image</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
              Choose Model
            </button>
            <button 
              onClick={onAnimate}
              disabled={isAnimating}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isAnimating ? 'Animating...' : 'Animate'}
            </button>
          </div>
          <div className="text-right text-lg font-semibold text-gray-300">
            Cost = N$1.40
          </div>
        </div>

      </div>

      {/* Bottom Panel: Final Output and Add to Scene */}
      <div className="mt-4">
        <div className="bg-gray-900 aspect-video rounded-lg flex items-center justify-center">
          <span className="text-gray-500">Final Output</span>
        </div>
        <button className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Add to Scene
        </button>
      </div>
    </div>
  );
};

export default ShotCreator;
