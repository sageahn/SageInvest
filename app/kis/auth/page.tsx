'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/app/components/app-shell';
import { KISAuthToken, KISConfig } from '@/lib/kis/types';

export default function KISAuthPage() {
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'mock'>('production');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentConfig, setCurrentConfig] = useState<KISConfig | null>(null);
  const [currentToken, setCurrentToken] = useState<KISAuthToken | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const fetchCurrentStatus = async () => {
      const [configRes, tokenRes] = await Promise.all([
        fetch('/api/kis/config'),
        fetch('/api/kis/status'),
      ]);
      if (configRes.ok) {
        const config = (await configRes.json()) as KISConfig | null;
        setCurrentConfig(config);
      }
      if (tokenRes.ok) {
        const tokenData = (await tokenRes.json()) as { token?: KISAuthToken };
        setCurrentToken(tokenData.token || null);
      }
    };
    fetchCurrentStatus();
    const interval = setInterval(fetchCurrentStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentToken?.expires_at) {
      setTimeRemaining('');
      return;
    }
    const timer = setInterval(() => {
      const diff = new Date(currentToken.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining('만료됨');
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${h}시간 ${m}분 ${s}초`);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentToken]);

  const authenticate = async () => {
    if (appKey.length !== 36 || appSecret.length !== 180) {
      setMessage({ type: 'error', text: 'AppKey(36) / AppSecret(180) 길이를 확인해주세요.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/kis/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey, appSecret, environment }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { token?: KISAuthToken };
      setCurrentToken(data.token || null);
      setMessage({ type: 'success', text: '인증 성공' });
      setAppSecret('');
    } catch {
      setMessage({ type: 'error', text: '인증 실패' });
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kis/refresh', { method: 'POST' });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { token?: KISAuthToken };
      setCurrentToken(data.token || null);
      setMessage({ type: 'success', text: '토큰 갱신 완료' });
    } catch {
      setMessage({ type: 'error', text: '토큰 갱신 실패' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell active="auth" title="KIS 인증" subtitle="인증 정보 입력과 토큰 상태를 확인합니다.">
      <div className="si-grid-2">
        <section className="si-card">
          <h3 style={{ marginTop: 0 }}>인증 정보 입력</h3>
          <div className="si-field">
            <label className="si-label">App Key</label>
            <input
              className="si-input"
              value={appKey}
              onChange={(e) => setAppKey(e.target.value)}
              maxLength={36}
              placeholder="36자 App Key"
            />
          </div>
          <div className="si-field">
            <label className="si-label">App Secret</label>
            <input
              className="si-input"
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              maxLength={180}
              placeholder="180자 App Secret"
            />
          </div>
          <div className="si-field">
            <label className="si-label">환경</label>
            <select
              className="si-select"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as 'production' | 'mock')}
            >
              <option value="production">Production</option>
              <option value="mock">Mock</option>
            </select>
          </div>
          <button className="si-btn si-btn-primary" onClick={authenticate} disabled={loading}>
            인증하기
          </button>
        </section>

        <section className="si-card">
          <h3 style={{ marginTop: 0 }}>현재 연결 정보</h3>
          <p>환경: {currentConfig?.environment || '미설정'}</p>
          <p>App Key: {currentConfig?.app_key ? `${currentConfig.app_key.slice(0, 8)}...` : '-'}</p>
          {currentToken ? (
            <>
              <p>토큰 유형: {currentToken.token_type}</p>
              <p>만료까지: {timeRemaining}</p>
              <button className="si-btn si-btn-secondary" onClick={refreshToken} disabled={loading}>
                토큰 갱신
              </button>
              <div className="si-message success" style={{ marginTop: 12 }}>
                현재 연결 상태: 정상. 토큰 유효 시간을 기준으로 자동 상태가 갱신됩니다.
              </div>
            </>
          ) : (
            <div className="si-message error" style={{ marginTop: 12 }}>
              발급된 토큰이 없습니다. 먼저 인증을 진행해주세요.
            </div>
          )}
        </section>
      </div>

      {message && <div className={`si-message ${message.type}`}>{message.text}</div>}
    </AppShell>
  );
}
