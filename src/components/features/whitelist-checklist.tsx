'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CREATOR_FIDS } from '@/lib/config';
import { cn } from '@/lib/utils';
import { fireSuccessConfetti } from '@/lib/confetti';
import { getCreatorInfo, type CreatorInfo } from '@/lib/whitelist';
import { 
  isInFarcasterContext, 
  promptAddMiniApp, 
  hasUserAddedMiniApp,
  openComposeCast,
  viewProfile 
} from '@/lib/farcaster-sdk';

interface WhitelistChecklistProps {
  status?: {
    follows_creator1: boolean;
    follows_creator2: boolean;
    has_casted: boolean;
    has_added_miniapp: boolean;
    is_whitelisted: boolean;
  };
  onRefresh: () => void;
  loading?: boolean;
}

export function WhitelistChecklist({ status, onRefresh, loading }: WhitelistChecklistProps) {
  const { address } = useAccount();
  const [refreshing, setRefreshing] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [creator1, setCreator1] = useState<CreatorInfo | null>(null);
  const [creator2, setCreator2] = useState<CreatorInfo | null>(null);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [addingMiniApp, setAddingMiniApp] = useState(false);
  const [sdkMiniAppAdded, setSdkMiniAppAdded] = useState<boolean | null>(null);

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

  // Check SDK mini app status on mount and sync with database
  useEffect(() => {
    async function checkAndSyncSdkStatus() {
      if (isInFarcasterContext() && address) {
        const added = await hasUserAddedMiniApp();
        setSdkMiniAppAdded(added);
        
        // Sync SDK status with database
        // If SDK says added but database says not, update database
        // If SDK says not added but database says added, update database
        if (added && !status?.has_added_miniapp) {
          // User has added mini app but database doesn't know - sync it
          await fetch('/api/miniapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: address }),
          });
          onRefresh();
        } else if (!added && status?.has_added_miniapp) {
          // User has removed mini app - update database
          await fetch('/api/miniapp', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: address }),
          });
          onRefresh();
        }
      }
    }
    checkAndSyncSdkStatus();
  }, [address, status?.has_added_miniapp]);

  // Fire confetti when whitelist complete
  useEffect(() => {
    if (status?.is_whitelisted && !celebrated) {
      fireSuccessConfetti();
      setCelebrated(true);
    }
  }, [status?.is_whitelisted, celebrated]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Re-check SDK status
    if (isInFarcasterContext()) {
      const added = await hasUserAddedMiniApp();
      setSdkMiniAppAdded(added);
    }
    await onRefresh();
    setRefreshing(false);
  };

  // Handle "Add Mini App" action - uses SDK in Farcaster, fallback to URL in browser
  const handleAddMiniApp = async () => {
    if (!address) return;
    
    setAddingMiniApp(true);
    try {
      if (isInFarcasterContext()) {
        // Use SDK to show native "Add Mini App" dialog
        const result = await promptAddMiniApp();
        
        if (result.success) {
          setSdkMiniAppAdded(true);
          // Record in database
          await fetch('/api/miniapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: address }),
          });
          onRefresh();
        } else if (result.error === 'rejected_by_user') {
          console.log('User rejected add mini app');
        }
      } else {
        // Browser fallback - open Warpcast URL
        window.open(`https://warpcast.com/~/add-app?url=${encodeURIComponent(window.location.origin)}`, '_blank');
        await fetch('/api/miniapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: address }),
        });
        setTimeout(() => onRefresh(), 2000);
      }
    } catch (error) {
      console.error('Failed to add mini app:', error);
    } finally {
      setAddingMiniApp(false);
    }
  };

  // Handle follow action
  const handleFollow = async (fid: number) => {
    await viewProfile(fid);
  };

  // Handle cast action
  const handleCast = async () => {
    await openComposeCast('I just joined @visor - NFT points farming on Base! 🚀');
  };

  if (loading) {
    return (
      <Card variant="default">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </Card>
    );
  }

  const isComplete = status?.is_whitelisted;
  
  // Use SDK status if available (real-time), otherwise use database status
  const miniAppAdded = sdkMiniAppAdded !== null ? sdkMiniAppAdded : (status?.has_added_miniapp || false);

  const tasks = [
    {
      id: 'miniapp',
      label: 'Add Visor Mini App',
      completed: miniAppAdded,
      action: handleAddMiniApp,
      actionLabel: addingMiniApp ? 'Adding...' : 'Add App',
      loading: addingMiniApp,
      icon: '📱',
    },
    {
      id: 'follow1',
      label: creator1 ? `Follow @${creator1.username}` : 'Follow Creator 1',
      displayName: creator1?.displayName,
      pfpUrl: creator1?.pfpUrl,
      completed: status?.follows_creator1 || false,
      action: () => handleFollow(CREATOR_FIDS.CREATOR_1),
      actionLabel: 'Follow',
      loading: creatorsLoading,
    },
    {
      id: 'follow2',
      label: creator2 ? `Follow @${creator2.username}` : 'Follow Creator 2',
      displayName: creator2?.displayName,
      pfpUrl: creator2?.pfpUrl,
      completed: status?.follows_creator2 || false,
      action: () => handleFollow(CREATOR_FIDS.CREATOR_2),
      actionLabel: 'Follow',
      loading: creatorsLoading,
    },
    {
      id: 'cast',
      label: 'Cast about Visor',
      completed: status?.has_casted || false,
      action: handleCast,
      actionLabel: 'Cast',
      loading: false,
      icon: '📝',
    },
  ];
