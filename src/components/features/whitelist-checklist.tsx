'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CREATOR_FIDS } from '@/lib/config';
import { getFarcasterProfileUrl, getFarcasterComposeUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { fireSuccessConfetti } from '@/lib/confetti';
import { getCreatorInfo, type CreatorInfo } from '@/lib/whitelist';

interface WhitelistChecklistProps {
  status?: {
    follows_creator1: boolean;
    follows_creator2: boolean;
    has_casted: boolean;
    is_whitelisted: boolean;
  };
  onRefresh: () => void;
  loading?: boolean;
}

export function WhitelistChecklist({ status, onRefresh, loading }: WhitelistChecklistProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [creator1, setCreator1] = useState<CreatorInfo | null>(null);
  const [creator2, setCreator2] = useState<CreatorInfo | null>(null);
  const [creatorsLoading, setCreatorsLoading] = useState(true);

  // Fetch creator info on mount
  useEffect(() => {
    async function fetchCreators() {
      try {
        const { creator1, creator2 } = await getCreatorInfo();
        setCreator1(creator1);
        setCreator2(creator2);
      } catch (error) {
        console.error('Failed to fetch creator info:', error);
      } finally {
        setCreatorsLoading(false);
      }
    }
    fetchCreators();
  }, []);

  // Fire confetti when whitelist complete
  useEffect(() => {
    if (status?.is_whitelisted && !celebrated) {
      fireSuccessConfetti();
      setCelebrated(true);
    }
  }, [status?.is_whitelisted, celebrated]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Card variant="default">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </Card>
    );
  }

  const isComplete = status?.is_whitelisted;

  const tasks = [
    {
      id: 'follow1',
      label: creator1 ? `Follow @${creator1.username}` : 'Follow Creator 1',
      displayName: creator1?.displayName,
      pfpUrl: creator1?.pfpUrl,
      completed: status?.follows_creator1 || false,
      action: () => window.open(getFarcasterProfileUrl(CREATOR_FIDS.CREATOR_1), '_blank'),
      actionLabel: 'Follow',
      loading: creatorsLoading,
    },
    {
      id: 'follow2',
      label: creator2 ? `Follow @${creator2.username}` : 'Follow Creator 2',
      displayName: creator2?.displayName,
      pfpUrl: creator2?.pfpUrl,
      completed: status?.follows_creator2 || false,
      action: () => window.open(getFarcasterProfileUrl(CREATOR_FIDS.CREATOR_2), '_blank'),
      actionLabel: 'Follow',
      loading: creatorsLoading,
    },
    {
      id: 'cast',
      label: 'Cast about Visor',
      completed: status?.has_casted || false,
      action: () => window.open(getFarcasterComposeUrl('I just joined @visor - NFT points farming on Base! 🚀'), '_blank'),
      actionLabel: 'Cast',
      loading: false,
    },
  ];

  return (
    <Card variant="default">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Whitelist Tasks</h3>
          <p className="text-sm text-[#666666]">Complete to unlock minting</p>
        </div>
        {isComplete && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 rounded-full">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium text-green-500">Whitelisted</span>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-2 mb-4">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            label={task.label}
            completed={task.completed}
            onAction={task.action}
            actionLabel={task.actionLabel}
          />
        ))}
      </div>

      {/* Refresh Button */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={handleRefresh}
        loading={refreshing}
      >
        Refresh Status
      </Button>
    </Card>
  );
}

function TaskItem({
  label,
  displayName,
  pfpUrl,
  completed,
  onAction,
  actionLabel,
  loading,
}: {
  label: string;
  displayName?: string;
  pfpUrl?: string;
  completed: boolean;
  onAction: () => void;
  actionLabel: string;
  loading?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-xl',
      'bg-[#111111] border',
      completed ? 'border-green-500/30' : 'border-[#333333]'
    )}>
      <div className="flex items-center gap-3">
        {/* PFP or Checkbox */}
        {pfpUrl ? (
          <div className="relative">
            <img 
              src={pfpUrl} 
              alt={displayName || 'Creator'} 
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/></svg>';
              }}
            />
            {completed && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            completed ? 'bg-green-500' : 'bg-[#333333]'
          )}>
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#666666] border-t-white rounded-full animate-spin" />
            ) : completed ? (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#666666]" />
            )}
          </div>
        )}
        
        {/* Label and Display Name */}
        <div className="flex flex-col">
          <span className={cn(
            'text-sm',
            completed ? 'text-[#a0a0a0] line-through' : 'text-white'
          )}>
            {loading ? 'Loading...' : label}
          </span>
          {displayName && !loading && (
            <span className="text-xs text-[#666666]">{displayName}</span>
          )}
        </div>
      </div>

      {!completed && (
        <button
          onClick={onAction}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
