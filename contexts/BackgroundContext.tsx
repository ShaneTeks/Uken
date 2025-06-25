import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../supabaseClient.ts'; // Adjust path as necessary

interface BackgroundData {
  page_key: string;
  image_data_url: string | null;
}

interface BackgroundContextType {
  backgrounds: Record<string, string | null>;
  isLoading: boolean;
  error: string | null;
  refreshBackgrounds: () => Promise<void>;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const BackgroundProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [backgrounds, setBackgrounds] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBackgrounds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('page_backgrounds')
        .select('page_key, image_data_url');

      if (fetchError) {
        throw fetchError;
      }

      const backgroundsMap: Record<string, string | null> = {};
      if (data) {
        data.forEach((item: BackgroundData) => {
          backgroundsMap[item.page_key] = item.image_data_url;
        });
      }
      setBackgrounds(backgroundsMap);
    } catch (e: any) {
      console.error('Failed to fetch backgrounds:', e);
      setError(e.message || 'An unknown error occurred while fetching backgrounds.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackgrounds();
  }, [fetchBackgrounds]);

  return (
    <BackgroundContext.Provider value={{ backgrounds, isLoading, error, refreshBackgrounds: fetchBackgrounds }}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = (): BackgroundContextType => {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};