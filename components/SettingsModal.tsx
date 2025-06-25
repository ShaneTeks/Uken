import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { XMarkIcon } from './icons/XMarkIcon.tsx';
import { supabase } from '../supabaseClient.ts';
import { useBackground } from '../contexts/BackgroundContext.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pagesForBackground = [
  { key: 'home', name: 'Home Page' },
  { key: 'create', name: 'Create Page' },
  { key: 'characters', name: 'Characters Page' },
  { key: 'backgrounds', name: 'Backgrounds Page' },
  { key: 'pricing', name: 'Pricing Page' },
  { key: 'global', name: 'Global Default (All Pages)'}
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [selectedPageKey, setSelectedPageKey] = useState<string>(pagesForBackground[0].key);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const { refreshBackgrounds } = useBackground();

  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      setSelectedPageKey(pagesForBackground[0].key);
      setSelectedFile(null);
      setFileError(null);
      setIsApplying(false);
    }
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, handleEscapeKey]);

  if (!isOpen) {
    return null;
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setFileError("File is too large. Maximum size is 5MB.");
        setSelectedFile(null);
        event.target.value = ''; 
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setFileError("Invalid file type. Please select a JPG, PNG, GIF or WEBP image.");
        setSelectedFile(null);
        event.target.value = '';
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    setFileError(null);

    let imageDataUrl: string | null = null;

    if (selectedFile) {
      try {
        imageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Could not read the selected file."));
          reader.readAsDataURL(selectedFile);
        });
      } catch (error: any) {
        setFileError(error.message || "Could not read the selected file.");
        setIsApplying(false);
        return;
      }
    }

    try {
      const { error: dbError } = await supabase
        .from('page_backgrounds')
        .upsert({ 
            page_key: selectedPageKey, 
            image_data_url: imageDataUrl, // This will be null if no file is selected, effectively clearing the background
            updated_at: new Date().toISOString() 
        }, { onConflict: 'page_key' });

      if (dbError) {
        throw dbError; // Throw the error to be caught by the catch block
      }

      await refreshBackgrounds(); // Refresh backgrounds from context
      console.log(`Settings: Background for ${selectedPageKey} ${imageDataUrl ? 'updated' : 'cleared'} in DB.`);
      onClose();

    } catch (error: any) {
      console.error("Error saving background:", error); // Crucial for your debugging
      let displayErrorMessage = "Failed to save background.";
      if (error && typeof error.message === 'string' && error.message.trim() !== "") {
        displayErrorMessage += ` ${error.message}`;
      } else if (error && typeof error.details === 'string' && error.details.trim() !== "") { // Supabase errors often have a 'details' field
        displayErrorMessage += ` Details: ${error.details}`;
      } else if (error && typeof error.hint === 'string' && error.hint.trim() !== "") { // And a 'hint' field
         displayErrorMessage += ` Hint: ${error.hint}`;
      } else if (typeof error === 'string' && error.trim() !== "") {
        displayErrorMessage += ` ${error}`;
      } else {
        try {
          const stringifiedError = JSON.stringify(error);
          if (stringifiedError && stringifiedError !== '{}' && stringifiedError !== 'null' && stringifiedError !== 'undefined') {
             displayErrorMessage += ` Raw Error: ${stringifiedError}`;
          } else {
            displayErrorMessage += " An unknown error occurred."
          }
        } catch (e) {
          displayErrorMessage += " An unknown error occurred, and additional details could not be stringified."
        }
      }
      setFileError(displayErrorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div 
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100 opacity-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 id="settings-modal-title" className="text-xl font-semibold text-gray-800">Page Background Settings</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close settings"
            disabled={isApplying}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="page-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Page to Customize:
            </label>
            <select
              id="page-select"
              name="page"
              value={selectedPageKey}
              onChange={(e) => setSelectedPageKey(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-stone-500 focus:border-stone-500 sm:text-sm"
              disabled={isApplying}
            >
              {pagesForBackground.map((page) => (
                <option key={page.key} value={page.key}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-1">
              Upload Background Image (Optional):
            </label>
            <input
              type="file"
              id="image-upload"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-md file:border-0
                         file:text-sm file:font-semibold
                         file:bg-stone-50 file:text-stone-700
                         hover:file:bg-stone-100"
              disabled={isApplying}
            />
            {selectedFile && <p className="text-xs text-gray-600 mt-1">Selected: {selectedFile.name}</p>}
            {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
             <p className="text-xs text-gray-500 mt-1">Max 5MB. JPG, PNG, GIF, WEBP. Leave empty or clear selection to remove existing background.</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold py-2 px-4 rounded-md shadow-sm text-sm transition-colors disabled:opacity-50"
            disabled={isApplying}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleApply}
            disabled={isApplying || !!fileError} // Disable if error or applying
            className="bg-stone-600 hover:bg-stone-700 text-white font-semibold py-2 px-4 border border-stone-600 rounded-md shadow-sm text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};
