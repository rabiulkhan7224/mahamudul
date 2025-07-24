
"use client";

import { useEffect, useState, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  formatter: (value: number) => string;
  duration?: number;
  start?: boolean;
}

export const AnimatedNumber = ({ value, formatter, duration = 1000, start = true }: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (!start) {
        // If animation is not supposed to start, ensure display value is reset or at initial state.
        setDisplayValue(0); 
        startTimeRef.current = undefined;
        return;
    }

    const startAnimation = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);
      
      const easedPercentage = 1 - Math.pow(1 - percentage, 3);
      const currentValue = easedPercentage * value;

      setDisplayValue(currentValue);

      if (progress < duration) {
        frameRef.current = requestAnimationFrame(startAnimation);
      } else {
         setDisplayValue(value);
      }
    };

    startTimeRef.current = undefined;
    frameRef.current = requestAnimationFrame(startAnimation);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration, start]);

  return <span>{formatter(displayValue)}</span>;
};
