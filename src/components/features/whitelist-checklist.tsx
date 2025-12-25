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
  hasUserEnabledNotifications,
  requestNotificationPermission,
  getMiniAppContext,
  openComposeCast,
  viewProfile 
} from '@/lib/farcaster-sdk';
import { useToast } from '@/components/ui/toast';

interface WhitelistChecklistProps {
  status?: {
    follows_creator1: boolean;
    follows_creator2: boolean;
    has_casted: boolean;
    has_added_miniapp: boolean;
    has_notifications: boolean;
    is_whitelisted: boolean;
  };
  onRefresh: () => void;
  loading?: boolean;
}

export function WhitelistChecklist({ status, onRefresh, loading }: WhitelistChecklistProps) {
  const { address } = useAccount();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [creator1, setCreator1] = useState<CreatorInfo | null>(null);
  const [creator2, setCreator2] = useState<CreatorInfo | null>(null);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [addingMiniApp, setAddingMiniApp] = useState(false);
  const [enablingNotifications, setEnablingNotifications] = useState(false);
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
      if (!address) return;
      
      // Only check SDK status if in Farcaster context
      if (isInFarcasterContext()) {
        const context = await getMiniAppContext();
        const added = await hasUserAddedMiniApp();
        setSdkMiniAppAdded(added);
        
        // Sync SDK status with database
        if (added && !status?.has_added_miniapp) {
          // User has added mini app but database doesn't know - sync it
          await fetch('/api/miniapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: address }),
          });
          showToast('📱 Mini App added', 'success');
          onRefresh();
        } else if (!added && status?.has_added_miniapp) {
          // User has removed mini app - update database
          await fetch('/api/miniapp', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: address }),
          });
          showToast('📱 Mini App removed', 'info');
          onRefresh();
        }
        
        // Check notification status from SDK and sync
        const hasNotifications = await hasUserEnabledNotifications();
        const fid = context?.user?.fid;
        const notifDetails = context?.client?.notificationDetails;
        
        // Log for debugging
        console.log('[Sync] FID:', fid, 'hasNotifications:', hasNotifications, 'notifDetails:', notifDetails);
        
        // If user has notifications enabled (from menu or SDK), save token
        if (hasNotifications && fid && notifDetails) {
          // Always try to save/update token if we have notificationDetails
          console.log('[Sync] Saving notification token for FID:', fid);
          await fetch('/api/notifications/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid,
              token: notifDetails.token,
              url: notifDetails.url,
              wallet_address: address,
            }),
          });
          if (!status?.has_notifications) {
            showToast('🔔 Notifications enabled', 'success');
            onRefresh();
          }
        } else if (!hasNotifications && status?.has_notifications && fid) {
          // User has DISABLED notifications - sync to database
          console.log('[Notifications] User disabled notifications, syncing to database');
          await fetch('/api/notifications/token', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid,
              wallet_address: address,
            }),
          });
          showToast('🔕 Notifications disabled', 'info');
          onRefresh();
        }
      } else {
        // Not in Farcaster context - rely on database status only
        setSdkMiniAppAdded(null);
      }
    }
    checkAndSyncSdkStatus();
    
    // Also re-check when page becomes visible (user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndSyncSdkStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [address, status?.has_added_miniapp, status?.has_notifications, onRefresh]);

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
          showToast('📱 Mini App added!', 'success');
          onRefresh();
        } else if (result.error === 'rejected_by_user') {
          console.log('User rejected add mini app');
          showToast('Mini App not added', 'info');
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

  // Handle "Enable Notifications" action
  const handleEnableNotifications = async () => {
    if (!address) {
      console.log('[Notifications] No address available');
      return;
    }
    
    console.log('[Notifications] Starting enable flow for:', address);
    setEnablingNotifications(true);
    try {
      if (isInFarcasterContext()) {
        console.log('[Notifications] In Farcaster context, requesting permission...');
        
        // Get context to get FID
        const context = await getMiniAppContext();
        const fid = context?.user?.fid;
        
        if (!fid) {
          console.log('[Notifications] No FID available from context');
          // Fallback: just record in database without token
          await fetch('/api/notifications-enabled', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: address }),
          });
          onRefresh();
          return;
        }
        
        // Use SDK to request notification permission
        const result = await requestNotificationPermission();
        console.log('[Notifications] SDK result:', result);
        
        if (result.success && result.notificationDetails) {
          // Save notification token to database
          console.log('[Notifications] Saving notification token for FID:', fid);
          const tokenResponse = await fetch('/api/notifications/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid,
              token: result.notificationDetails.token,
              url: result.notificationDetails.url,
              wallet_address: address,
            }),
          });
          const tokenData = await tokenResponse.json();
          console.log('[Notifications] Token save response:', tokenResponse.status, tokenData);
          showToast('🔔 Notifications enabled!', 'success');
          onRefresh();
        } else if (result.error === 'rejected_by_user') {
          console.log('[Notifications] User rejected notification permission');
          showToast('Notifications not enabled', 'info');
        } else {
          // Fallback: just record that user clicked enable (without token)
          console.log('[Notifications] SDK failed or no token, using fallback. Error:', result.error);
          await fetch('/api/notifications-enabled', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: address }),
          });
          onRefresh();
        }
      } else {
        // Browser fallback - just record in database
        console.log('[Notifications] Not in Farcaster context, using browser fallback');
        const response = await fetch('/api/notifications-enabled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: address }),
        });
        const data = await response.json();
        console.log('[Notifications] Browser fallback API response:', response.status, data);
        onRefresh();
      }
    } catch (error) {
      console.error('[Notifications] Failed to enable notifications:', error);
    } finally {
      setEnablingNotifications(false);
    }
  };

  // Handle follow action
  const handleFollow = async (fid: number) => {
    await viewProfile(fid);
    showToast('👤 Opening profile...', 'info');
  };

  // Handle cast action
  const handleCast = async () => {
    if (!address) return;
    
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://visor-app-opal.vercel.app';
    const success = await openComposeCast(
      'I just joined the whitelist & early access! 🎉\n\nBuilt by @visor @ukhy89',
      [appUrl]
    );
    
    // Record cast in database when user opens compose dialog
    // This is more reliable than Neynar API which requires paid plan
    if (success) {
      try {
        await fetch('/api/cast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: address }),
        });
        showToast('📝 Cast recorded! Refresh to update status.', 'success');
        // Auto refresh after a short delay
        setTimeout(() => onRefresh(), 1500);
      } catch (error) {
        console.error('Failed to record cast:', error);
        showToast('📝 Opening cast composer...', 'info');
      }
    } else {
      showToast('📝 Opening cast composer...', 'info');
    }
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
      id: 'notifications',
      label: 'Enable Notifications',
      completed: status?.has_notifications || false,
      action: handleEnableNotifications,
      actionLabel: enablingNotifications ? 'Enabling...' : 'Enable',
      loading: enablingNotifications,
      icon: '🔔',
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
  completed,
  onAction,
  actionLabel,
}: {
  label: string;
  completed: boolean;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-xl',
      'bg-[#111111] border',
      completed ? 'border-green-500/30' : 'border-[#333333]'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          completed ? 'bg-green-500' : 'bg-[#333333]'
        )}>
          {completed ? (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#666666]" />
          )}
        </div>
        <span className={cn(
          'text-sm',
          completed ? 'text-[#a0a0a0] line-through' : 'text-white'
        )}>
          {label}
        </span>
      </div>

      {!completed && (
        <button
          onClick={onAction}
          className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
