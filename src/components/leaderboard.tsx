'use client';

import { useState, useEffect } from 'react';
import { getLeaderboard, LeaderboardEntry } from '@/lib/points';

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await getLeaderboard(50);
      setEntries(data);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-lg p-3 animate-pulse">
            <div className="h-5 bg-gray-800 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-4">🏆 Top 50 Leaderboard</h2>
      
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.address}
            className={`flex items-center justify-between p-3 rounded-lg ${
              index < 3 ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-700/30' : 'bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-6 text-center font-bold ${
                index === 0 ? 'text-yellow-400' :
                index === 1 ? 'text-gray-300' :
                index === 2 ? 'text-orange-400' : 'text-gray-500'
              }`}>
                {index + 1}
              </span>
              <span className="text-gray-300 font-mono text-sm">
                {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
              </span>
            </div>
            <span className="font-semibold text-white">
              {entry.points.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="text-center text-gray-500 py-8">No entries yet. Be the first!</p>
      )}
    </div>
  );
}
