'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

// Admin FID that can access this page
const ADMIN_FID = 250704;

export default function AdminNotificationsPage() {
  const { address, isConnected } = useAccount();
  const { showToast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userFid, setUserFid] = useState<number | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetUrl, setTargetUrl] = useState('https://visor-app-opal.vercel.app');
  const [sendType, setSendType] = useState<'broadcast' | 'single' | 'multi'>('broadcast');
  const [singleFid, setSingleFid] = useState('');
  const [multiFids, setMultiFids] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Check if user is admin by fetching FID from address
  useEffect(() => {
    async function checkAdmin() {
      if (!address) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`/api/farcaster/user?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          const fid = data.user?.fid;
          setUserFid(fid);
          if (fid && fid === ADMIN_FID) {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
      }
      setLoading(false);
    }
    
    checkAdmin();
  }, [address]);

  const handleSend = async () => {
    if (!title || !body || !targetUrl) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (!apiKey) {
      showToast('Please enter Admin API Key', 'error');
      return;
    }

    setSending(true);

    try {
      const payload: Record<string, unknown> = {
        title,
        body,
        targetUrl,
      };

      if (sendType === 'broadcast') {
        payload.broadcast = true;
      } else if (sendType === 'single') {
        if (!singleFid) {
          showToast('Please enter FID', 'error');
          setSending(false);
          return;
        }
        payload.fid = parseInt(singleFid);
      } else if (sendType === 'multi') {
        if (!multiFids) {
          showToast('Please enter FIDs', 'error');
          setSending(false);
          return;
        }
        payload.fids = multiFids.split(',').map(f => parseInt(f.trim()));
      }

      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to send', 'error');
        return;
      }

      // Handle different response formats
      if (data.type === 'broadcast' || data.type === 'multi') {
        showToast(`Notification sent! Sent: ${data.sent || 0}, Failed: ${data.failed || 0}`, 'success');
      } else {
        showToast(`Notification sent! Success: ${data.successfulTokens?.length || (data.success ? 1 : 0)}`, 'success');
      }
      
      // Reset form
      setTitle('');
      setBody('');
    } catch (error) {
      console.error('Send error:', error);
      showToast('Failed to send notification', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <Card variant="default" className="text-center py-12">
          <p className="text-[#a0a0a0]">Loading...</p>
        </Card>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="p-4">
        <Card variant="default" className="text-center py-12">
          <p className="text-2xl mb-2">🔗</p>
          <p className="text-[#a0a0a0]">Connect your wallet to access admin panel</p>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card variant="default" className="text-center py-12">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-[#a0a0a0]">Admin access required</p>
          <p className="text-xs text-[#666666] mt-2">
            Only FID {ADMIN_FID} can access this page
          </p>
          {userFid && (
            <p className="text-xs text-[#444444] mt-1">Your FID: {userFid}</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-white">📢 Send Notifications</h1>

      {/* API Key */}
      <Card variant="default">
        <label className="text-sm text-[#a0a0a0] mb-2 block">Admin API Key</label>
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your admin API key"
        />
      </Card>

      {/* Send Type */}
      <Card variant="default">
        <label className="text-sm text-[#a0a0a0] mb-2 block">Send To</label>
        <div className="flex gap-2">
          <Button
            variant={sendType === 'broadcast' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSendType('broadcast')}
          >
            All Users
          </Button>
          <Button
            variant={sendType === 'single' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSendType('single')}
          >
            Single FID
          </Button>
          <Button
            variant={sendType === 'multi' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSendType('multi')}
          >
            Multiple FIDs
          </Button>
        </div>

        {sendType === 'single' && (
          <div className="mt-3">
            <Input
              type="number"
              value={singleFid}
              onChange={(e) => setSingleFid(e.target.value)}
              placeholder="Enter FID (e.g. 250704)"
            />
          </div>
        )}

        {sendType === 'multi' && (
          <div className="mt-3">
            <Input
              value={multiFids}
              onChange={(e) => setMultiFids(e.target.value)}
              placeholder="Enter FIDs separated by comma (e.g. 250704, 1043335)"
            />
          </div>
        )}
      </Card>

      {/* Notification Content */}
      <Card variant="default">
        <label className="text-sm text-[#a0a0a0] mb-2 block">Title (max 32 chars)</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 32))}
          placeholder="Notification title"
          maxLength={32}
        />
        <p className="text-xs text-[#666666] mt-1">{title.length}/32</p>
      </Card>

      <Card variant="default">
        <label className="text-sm text-[#a0a0a0] mb-2 block">Body (max 128 chars)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 128))}
          placeholder="Notification message"
          maxLength={128}
          className="w-full bg-[#111111] border border-[#333333] rounded-lg p-3 text-white text-sm resize-none h-20"
        />
        <p className="text-xs text-[#666666] mt-1">{body.length}/128</p>
      </Card>

      <Card variant="default">
        <label className="text-sm text-[#a0a0a0] mb-2 block">Target URL</label>
        <Input
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://visor-app-opal.vercel.app"
        />
        <p className="text-xs text-[#666666] mt-1">URL to open when user clicks notification</p>
      </Card>

      {/* Send Button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleSend}
        loading={sending}
        disabled={!title || !body || !apiKey}
      >
        {sending ? 'Sending...' : 'Send Notification'}
      </Button>
    </div>
  );
}
