"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { DraggableCalculator } from '@/components/ui/calculator';

interface CalculatorContextType {
  isOpen: boolean;
  isMinimized: boolean;
  toggleCalculator: () => void;
  minimizeCalculator: () => void;
  closeCalculator: () => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export const CalculatorProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleCalculator = () => {
    setIsOpen(prev => {
        // If it's about to open, reset minimized state
        if (!prev) {
            setIsMinimized(false);
        }
        return !prev;
    });
  };

  const minimizeCalculator = () => {
    setIsMinimized(prev => !prev);
  };
  
  const closeCalculator = () => {
    setIsOpen(false);
  }

  return (
    <CalculatorContext.Provider value={{ isOpen, isMinimized, toggleCalculator, minimizeCalculator, closeCalculator }}>
      {children}
      {isOpen && <DraggableCalculator />}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
};
