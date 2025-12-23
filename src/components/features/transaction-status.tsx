'use client';

import { Button } from '@/components/ui/button';
import { getExplorerTxUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

type TransactionState = 'idle' | 'waiting' | 'pending' | 'success' | 'failed';

interface TransactionStatusProps {
  state: TransactionState;
  txHash?: string;
  message?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export function TransactionStatus({
  state,
  txHash,
  message,
  onRetry,
  onClose,
}: TransactionStatusProps) {
  if (state === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm bg-[#111111] rounded-2xl p-6 text-center animate-scaleIn">
        {/* Icon */}
        <div className="mb-4">
          {state === 'waiting' && <WaitingIcon />}
          {state === 'pending' && <PendingIcon />}
          {state === 'success' && <SuccessIcon />}
          {state === 'failed' && <FailedIcon />}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2">
          {state === 'waiting' && 'Waiting for Wallet'}
          {state === 'pending' && 'Transaction Pending'}
          {state === 'success' && 'Success!'}
          {state === 'failed' && 'Transaction Failed'}
        </h3>

        {/* Message */}
        <p className="text-sm text-[#a0a0a0] mb-4">
          {message || getDefaultMessage(state)}
        </p>

        {/* Tx Hash Link */}
        {txHash && (
          <a
            href={getExplorerTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-[#666666] hover:text-white transition-colors mb-4"
          >
            View on Explorer
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {state === 'failed' && onRetry && (
            <Button variant="primary" size="md" className="flex-1" onClick={onRetry}>
              Try Again
            </Button>
          )}
          {(state === 'success' || state === 'failed') && onClose && (
            <Button
              variant={state === 'failed' && onRetry ? 'secondary' : 'primary'}
              size="md"
              className="flex-1"
              onClick={onClose}
            >
              {state === 'success' ? 'Done' : 'Close'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function getDefaultMessage(state: TransactionState): string {
  switch (state) {
    case 'waiting':
      return 'Please confirm the transaction in your wallet';
    case 'pending':
      return 'Your transaction is being processed...';
    case 'success':
      return 'Your transaction has been confirmed';
    case 'failed':
      return 'Something went wrong. Please try again.';
    default:
      return '';
  }
}

function WaitingIcon() {
  return (
    <div className="w-16 h-16 mx-auto rounded-full bg-[#222222] flex items-center justify-center">
      <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
  );
}

function PendingIcon() {
  return (
    <div className="w-16 h-16 mx-auto rounded-full bg-[#222222] flex items-center justify-center">
      <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
}

function SuccessIcon() {
  return (
    <div className="w-16 h-16 mx-auto rounded-full bg-green-500 flex items-center justify-center animate-scaleIn">
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function FailedIcon() {
  return (
    <div className="w-16 h-16 mx-auto rounded-full bg-red-500 flex items-center justify-center animate-scaleIn">
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}
