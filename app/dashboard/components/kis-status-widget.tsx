'use client';

import { useEffect, useState } from 'react';
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
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/kis/status');
        if (!response.ok) {
          setConnectionStatus({ status: 'disconnected' });
          return;
        }

        const data = (await response.json()) as { token?: KISAuthToken };
        if (!data.token) {
          setConnectionStatus({ status: 'disconnected' });
          return;
        }

        const expiresAt = new Date(data.token.expires_at);
        setConnectionStatus({
          status: expiresAt < new Date() ? 'expired' : 'connected',
          token: data.token,
          expiresAt,
        });
      } catch {
        setConnectionStatus({ status: 'disconnected' });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!connectionStatus.expiresAt) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const diff = connectionStatus.expiresAt!.getTime() - Date.now();
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

  const refreshToken = async () => {
    await fetch('/api/kis/refresh', { method: 'POST' });
    window.location.reload();
  };

  const statusText =
    connectionStatus.status === 'connected'
      ? 'KIS API 연결 정상'
      : connectionStatus.status === 'expired'
        ? '토큰 만료'
        : '연결 안됨';

  return (
    <section className="si-card">
      <h3 style={{ marginTop: 0 }}>KIS API 상태</h3>
      <p className={`si-message ${connectionStatus.status === 'connected' ? 'success' : 'error'}`}>
        {statusText}
      </p>

      {connectionStatus.status === 'connected' && connectionStatus.token && (
        <div>
          <p>환경: {connectionStatus.token.environment}</p>
          <p>토큰 유형: {connectionStatus.token.token_type}</p>
          <p>만료까지: {timeRemaining}</p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>
            마지막 동기화 기준 상태입니다.
          </p>
          <button className="si-btn si-btn-primary" onClick={refreshToken}>
            토큰 갱신
          </button>
        </div>
      )}

      {connectionStatus.status !== 'connected' && (
        <div className="si-actions">
          <a className="si-btn si-btn-secondary" href="/kis/settings">
            설정하러 가기
          </a>
          {connectionStatus.status === 'expired' && (
            <button className="si-btn si-btn-primary" onClick={refreshToken}>
              토큰 갱신
            </button>
          )}
        </div>
      )}
    </section>
  );
}
