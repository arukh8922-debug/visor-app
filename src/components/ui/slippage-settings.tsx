'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SlippageSettingsProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const PRESET_VALUES = [1, 3, 5, 10];

export function SlippageSettings({ value, onChange, className }: SlippageSettingsProps) {
  const [isCustom, setIsCustom] = useState(!PRESET_VALUES.includes(value));
  const [customValue, setCustomValue] = useState(value.toString());

  const handlePresetClick = (preset: number) => {
    setIsCustom(false);
    onChange(preset);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomValue(val);
    
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 50) {
      onChange(num);
    }
  };

  const handleCustomFocus = () => {
    setIsCustom(true);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#666666]">Slippage Tolerance</span>
        <span className="text-xs text-[#a0a0a0]">{value}%</span>
      </div>
      
      <div className="flex gap-2">
        {/* Preset buttons */}
        {PRESET_VALUES.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors',
              value === preset && !isCustom
                ? 'bg-white text-black'
                : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#222222]'
            )}
          >
            {preset}%
          </button>
        ))}
        
        {/* Custom input */}
        <div className="relative flex-1">
          <input
            type="number"
            value={isCustom ? customValue : ''}
            onChange={handleCustomChange}
            onFocus={handleCustomFocus}
            placeholder="Custom"
            min="0.1"
            max="50"
            step="0.1"
            className={cn(
              'w-full py-1.5 px-2 text-xs font-medium rounded-lg text-center',
              'bg-[#1a1a1a] border transition-colors',
              'placeholder:text-[#666666]',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              isCustom
                ? 'border-white/30 text-white'
                : 'border-transparent text-[#a0a0a0] hover:bg-[#222222]'
            )}
          />
          {isCustom && customValue && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#666666]">
              %
            </span>
          )}
        </div>
      </div>
      
      {/* Warning for high slippage */}
      {value > 10 && (
        <p className="text-xs text-yellow-500">
          ⚠️ High slippage may result in unfavorable trades
        </p>
      )}
    </div>
  );
}
