
"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface NavigationLoaderContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const NavigationLoaderContext = createContext<NavigationLoaderContextType | undefined>(undefined);

export const NavigationLoaderProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const value = { isLoading, startLoading, stopLoading };

  return (
    <NavigationLoaderContext.Provider value={value}>
      {children}
    </NavigationLoaderContext.Provider>
  );
};

export const useNavigationLoader = () => {
  const context = useContext(NavigationLoaderContext);
  if (context === undefined) {
    throw new Error('useNavigationLoader must be used within a NavigationLoaderProvider');
  }
  return context;
};
