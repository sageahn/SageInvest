'use client';

import { useState, useEffect } from 'react';
import { KISAuthToken } from '@/lib/kis/types';

interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'expired';
  token?: KISAuthToken;
  expiresAt?: Date;
}

export default function KISDashboardWidget() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
  });
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/kis/status');

        if (!response.ok) {
          setConnectionStatus({ status: 'disconnected' });
          return;
        }

        const data = await response.json() as { configured: boolean; token?: any };

        if (!data.token) {
          setConnectionStatus({ status: 'disconnected' });
          return;
        }

        const expiresAt = new Date(data.token.expires_at);
        const now = new Date();
        const isExpired = expiresAt < now;

        setConnectionStatus({
          status: isExpired ? 'expired' : 'connected',
          token: data.token,
          expiresAt,
        });
      } catch (error) {
        setConnectionStatus({ status: 'disconnected' });
      }
    };

    // Initial fetch
    fetchStatus();

    // Refresh every second
    const interval = setInterval(fetchStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!connectionStatus.expiresAt) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = connectionStatus.expiresAt!.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('만료됨');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}시간 ${minutes}분 ${seconds}초`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [connectionStatus.expiresAt]);

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return '연결됨';
      case 'expired':
        return '만료됨';
      default:
        return '연결 안됨';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">KIS API 상태</h3>
        <div className={`px-3 py-1 rounded-full border ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {connectionStatus.status === 'connected' && connectionStatus.token && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">환경</span>
            <span className="font-medium">{connectionStatus.token.environment}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">토큰 유형</span>
            <span className="font-medium">{connectionStatus.token.token_type}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">만료까지</span>
            <span className={`font-medium ${
              connectionStatus.expiresAt &&
              connectionStatus.expiresAt < new Date(Date.now() + 60 * 60 * 1000)
                ? 'text-red-600'
                : 'text-green-600'
            }`}>
              {timeRemaining}
            </span>
          </div>

          <div className="pt-3 border-t">
            <button
              onClick={async () => {
                try {
                  await fetch('/api/kis/refresh', { method: 'POST' });
                  if (typeof window !== "undefined") { window.location.reload(); };
                } catch (error) {
                  console.error('Token refresh failed:', error);
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              토큰 갱신
            </button>
          </div>
        </div>
      )}

      {connectionStatus.status === 'disconnected' && (
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">KIS API가 설정되지 않았습니다</p>
          <a
            href="/kis/settings"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            설정하러 가기
          </a>
        </div>
      )}

      {connectionStatus.status === 'expired' && (
        <div className="text-center py-4">
          <p className="text-red-600 mb-4">토큰이 만료되었습니다</p>
          <button
            onClick={async () => {
              try {
                await fetch('/api/kis/refresh', { method: 'POST' });
                if (typeof window !== "undefined") { window.location.reload(); };
              } catch (error) {
                console.error('Token refresh failed:', error);
              }
            }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            토큰 갱신
          </button>
        </div>
      )}
    </div>
  );
}
