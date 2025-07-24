
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCalculator } from '@/context/calculator-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Minus, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CalculatorButton = ({ onClick, children, className }: { onClick: () => void; children: React.ReactNode; className?: string }) => (
  <Button
    variant="outline"
    className={cn("text-xl h-14 w-14 rounded-full shadow-sm hover:bg-accent focus:ring-2 focus:ring-ring", className)}
    onClick={onClick}
  >
    {children}
  </Button>
);

const Calculator = () => {
  const [input, setInput] = useState('0');
  const [previousInput, setPreviousInput] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [shouldResetInput, setShouldResetInput] = useState(true);

  const evaluate = () => {
    if (!operator || previousInput === null) return parseFloat(input);

    const current = parseFloat(input);
    const previous = parseFloat(previousInput);

    switch (operator) {
      case '+':
        return previous + current;
      case '-':
        return previous - current;
      case '*':
        return previous * current;
      case '/':
        if (current === 0) {
          return 'Error';
        }
        return previous / current;
      default:
        return current;
    }
  };


  const handleInput = (value: string) => {
    if (input.length >= 15 && !shouldResetInput) return;
    if (shouldResetInput || input === 'Error' || (input === '0' && value !== '.')) {
      setInput(value);
      setShouldResetInput(false);
    } else {
      setInput(prev => prev + value);
    }
  };

  const handleOperator = (op: string) => {
    if (input === 'Error') return;

    if (!shouldResetInput && operator && previousInput !== null) {
      const result = evaluate();
      if (result === 'Error') {
        setInput('Error');
        setShouldResetInput(true);
        setPreviousInput(null);
        setOperator(null);
        return;
      }
      setPreviousInput(String(result));
      setInput(String(result));
    } else {
      setPreviousInput(input);
    }
    
    setOperator(op);
    setShouldResetInput(true);
  };

  const handleEquals = () => {
    if (!operator || previousInput === null || input === 'Error' || shouldResetInput) return;

    const result = evaluate();
     if (result === 'Error') {
        setInput('Error');
    } else {
        const resultString = String(parseFloat(result.toFixed(8)));
        setInput(resultString);
    }

    setPreviousInput(null);
    setOperator(null);
    setShouldResetInput(true);
  };

  const handleClear = () => {
    setInput('0');
    setPreviousInput(null);
    setOperator(null);
    setShouldResetInput(true);
  };

  const handleDecimal = () => {
    if (shouldResetInput) {
        setInput('0.');
        setShouldResetInput(false);
        return;
    }
    if (!input.includes('.')) {
      setInput(input + '.');
    }
  };
  
  const handlePercentage = () => {
    if (input === 'Error') return;

    if (operator && previousInput) {
        const previous = parseFloat(previousInput);
        const current = parseFloat(input);
        let result: number;
        
        if (operator === '+' || operator === '-') {
            const percentageValue = (previous * current) / 100;
            result = operator === '+' ? previous + percentageValue : previous - percentageValue;
        } else { // '*' or '/'
            const percentageValue = current / 100;
            result = operator === '*' ? previous * percentageValue : previous / percentageValue;
        }

        setInput(String(parseFloat(result.toFixed(8))));
        setPreviousInput(null);
        setOperator(null);
        setShouldResetInput(true);
    } else {
        // If only one number is present, calculate its percentage
        const result = parseFloat(input) / 100;
        setInput(String(parseFloat(result.toFixed(8))));
        setShouldResetInput(true);
    }
  };
  
  const handleToggleSign = () => {
    if (input === 'Error' || input === '0') return;
    setInput(prev => String(parseFloat(prev) * -1));
  };


  return (
    <div className="p-4 bg-background rounded-lg">
      <div className="bg-muted text-right p-4 rounded-md mb-4 break-all h-24 flex flex-col justify-end">
        <div className="text-sm text-muted-foreground truncate">{shouldResetInput ? (previousInput ?? '') : ''} {shouldResetInput ? (operator ?? '') : ''}</div>
        <div className="text-4xl font-bold truncate">{input}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <CalculatorButton onClick={handleClear} className="bg-destructive/20 hover:bg-destructive/30">AC</CalculatorButton>
        <CalculatorButton onClick={handleToggleSign} className="bg-secondary">+/-</CalculatorButton>
        <CalculatorButton onClick={handlePercentage} className="bg-secondary">%</CalculatorButton>
        <CalculatorButton onClick={() => handleOperator('/')} className="bg-primary/80 text-primary-foreground hover:bg-primary">÷</CalculatorButton>

        <CalculatorButton onClick={() => handleInput('7')}>7</CalculatorButton>
        <CalculatorButton onClick={() => handleInput('8')}>8</CalculatorButton>
        <CalculatorButton onClick={() => handleInput('9')}>9</CalculatorButton>
        <CalculatorButton onClick={() => handleOperator('*')} className="bg-primary/80 text-primary-foreground hover:bg-primary">×</CalculatorButton>

        <CalculatorButton onClick={() => handleInput('4')}>4</CalculatorButton>
        <CalculatorButton onClick={() => handleInput('5')}>5</CalculatorButton>
        <CalculatorButton onClick={() => handleInput('6')}>6</CalculatorButton>
        <CalculatorButton onClick={() => handleOperator('-')} className="bg-primary/80 text-primary-foreground hover:bg-primary">-</CalculatorButton>

        <CalculatorButton onClick={() => handleInput('1')}>1</CalculatorButton>
        <CalculatorButton onClick={() => handleInput('2')}>2</CalculatorButton>
        <CalculatorButton onClick={() => handleInput('3')}>3</CalculatorButton>
        <CalculatorButton onClick={() => handleOperator('+')} className="bg-primary/80 text-primary-foreground hover:bg-primary">+</CalculatorButton>

        <CalculatorButton onClick={() => handleInput('0')} className="col-span-2 w-full">0</CalculatorButton>
        <CalculatorButton onClick={handleDecimal}>.</CalculatorButton>
        <CalculatorButton onClick={handleEquals} className="bg-primary text-primary-foreground hover:bg-primary/90">=</CalculatorButton>
      </div>
    </div>
  );
};


export const DraggableCalculator = () => {
    const { isMinimized, minimizeCalculator, closeCalculator } = useCalculator();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const dragRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const offsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
      // Set initial position after component mounts to access window object
      setPosition({ x: window.innerWidth - 400, y: 80 });
    }, []);

    const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current || !dragRef.current) return;
        
        setPosition({
            x: e.clientX - offsetRef.current.x,
            y: e.clientY - offsetRef.current.y,
        });
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      isDraggingRef.current = true;
      
      const rect = dragRef.current.getBoundingClientRect();
      offsetRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      
      e.preventDefault();
    };
    
    // Cleanup event listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, []); // Empty dependency array means this runs once on mount and cleanup on unmount

    return (
        <div
          ref={dragRef}
          className="fixed z-[101] w-[350px] shadow-2xl rounded-lg"
          style={{ left: `${position.x}px`, top: `${position.y}px`, userSelect: 'none' }}
        >
            <Card>
                <CardHeader
                    onMouseDown={onMouseDown} // The mousedown handler should be on the drag handle
                    className="flex flex-row items-center justify-between p-2 bg-muted rounded-t-lg cursor-move"
                >
                    <span className="font-semibold text-sm pl-2">Calculator</span>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={minimizeCalculator}>
                            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeCalculator}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                {!isMinimized && (
                    <CardContent className="p-0">
                        <Calculator />
                    </CardContent>
                )}
            </Card>
        </div>
    );
};
