'use client';

import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  copyable?: boolean;
  onCopy?: () => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, copyable, onCopy, type, ...props }, ref) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      if (props.value) {
        await navigator.clipboard.writeText(String(props.value));
        setCopied(true);
        onCopy?.();
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#a0a0a0] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            className={cn(
              'w-full h-11 px-4 rounded-xl',
              'bg-[#111111] border border-[#333333]',
              'text-white placeholder:text-[#666666]',
              'focus:outline-none focus:border-white focus:ring-1 focus:ring-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              copyable && 'pr-20',
              className
            )}
            ref={ref}
            {...props}
          />
          {copyable && (
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2',
                'px-3 py-1.5 rounded-lg text-sm font-medium',
                'transition-all duration-200',
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-[#666666]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
