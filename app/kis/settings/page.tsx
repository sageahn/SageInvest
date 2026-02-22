'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/app/components/app-shell';
import { KISAuthToken, KISConfig } from '@/lib/kis/types';

interface KISSettingsProps {
  initialConfig?: KISConfig | null;
}

interface AccountSettings {
  cano: string;
  acntPrdtCd: string;
}

export default function KISSettingsPage({ initialConfig }: KISSettingsProps) {
  const [appKey, setAppKey] = useState(initialConfig?.app_key || '');
  const [appSecret, setAppSecret] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'mock'>(
    (initialConfig?.environment as 'production' | 'mock') || 'production'
  );
  const [accountSettings, setAccountSettings] = useState<AccountSettings | null>(null);
  const [canoInput, setCanoInput] = useState('');
  const [acntPrdtCdInput, setAcntPrdtCdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentConfig, setCurrentConfig] = useState<KISConfig | null>(null);
  const [currentToken, setCurrentToken] = useState<KISAuthToken | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const loadAccountSettings = async () => {
      const response = await fetch('/api/kis/account');
      if (!response.ok) return;
      const data = (await response.json()) as { data: AccountSettings | null };
      setAccountSettings(data.data);
    };
    loadAccountSettings();
  }, []);

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

  const saveConfig = async () => {
    if (appKey.length !== 36 || appSecret.length !== 180) {
      setMessage({ type: 'error', text: 'AppKey 36자 / AppSecret 180자를 확인해주세요.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/kis/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey, appSecret, environment }),
      });
      if (!response.ok) throw new Error();
      setMessage({ type: 'success', text: 'KIS 설정이 저장되었습니다.' });
      setAppSecret('');
    } catch {
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async () => {
    if (!window.confirm('KIS 설정을 삭제할까요?')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/kis/config', { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setAppKey('');
      setAppSecret('');
      setMessage({ type: 'success', text: 'KIS 설정이 삭제되었습니다.' });
    } catch {
      setMessage({ type: 'error', text: '설정 삭제에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/kis/test', { method: 'POST' });
      if (!response.ok) throw new Error();
      setMessage({ type: 'success', text: '연결 테스트 성공' });
    } catch {
      setMessage({ type: 'error', text: '연결 테스트 실패' });
    } finally {
      setLoading(false);
    }
  };

  const saveAccount = async () => {
    if (!/^\d{8}$/.test(canoInput) || !/^\d{2}$/.test(acntPrdtCdInput)) {
      setMessage({ type: 'error', text: '계좌번호 8자리 / 상품코드 2자리를 확인해주세요.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/kis/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cano: canoInput, acntPrdtCd: acntPrdtCdInput }),
      });
      if (!response.ok) throw new Error();
      setMessage({ type: 'success', text: '계좌 설정이 저장되었습니다.' });
      setAccountSettings({ cano: `${canoInput.slice(0, 4)}****`, acntPrdtCd: acntPrdtCdInput });
      setCanoInput('');
      setAcntPrdtCdInput('');
    } catch {
      setMessage({ type: 'error', text: '계좌 설정 저장에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell active="kis-settings" title="KIS 설정" subtitle="인증 정보와 계좌 정보를 관리합니다.">
      <div className="si-grid-3">
        <section className="si-card">
          <h3 style={{ marginTop: 0 }}>API 인증 설정</h3>
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
              <option value="production">Production (실전)</option>
              <option value="mock">Mock (모의투자)</option>
            </select>
          </div>
          <div className="si-actions">
            <button className="si-btn si-btn-primary" onClick={saveConfig} disabled={loading}>
              저장
            </button>
            <button className="si-btn si-btn-secondary" onClick={testConnection} disabled={loading}>
              연결 테스트
            </button>
            <button className="si-btn si-btn-danger" onClick={deleteConfig} disabled={loading}>
              삭제
            </button>
          </div>
        </section>

        <section className="si-card">
          <h3 style={{ marginTop: 0 }}>계좌 설정</h3>
          {accountSettings && (
            <p style={{ marginTop: 0, color: 'var(--muted-foreground)' }}>
              저장된 계좌: {accountSettings.cano}-{accountSettings.acntPrdtCd}
            </p>
          )}
          <div className="si-field">
            <label className="si-label">종합계좌번호 (8자리)</label>
            <input
              className="si-input"
              value={canoInput}
              onChange={(e) => setCanoInput(e.target.value)}
              maxLength={8}
              placeholder="예: 12345678"
            />
          </div>
          <div className="si-field">
            <label className="si-label">계좌상품코드 (2자리)</label>
            <input
              className="si-input"
              value={acntPrdtCdInput}
              onChange={(e) => setAcntPrdtCdInput(e.target.value)}
              maxLength={2}
              placeholder="예: 01"
            />
          </div>
          <button className="si-btn si-btn-primary" onClick={saveAccount} disabled={loading}>
            계좌 저장
          </button>
        </section>

        <section className="si-card">
          <h3 style={{ marginTop: 0 }}>현재 연결 정보</h3>
          <p style={{ marginTop: 0, color: 'var(--muted-foreground)' }}>
            환경: {currentConfig?.environment || '미설정'}
          </p>
          <p style={{ color: 'var(--muted-foreground)' }}>
            App Key: {currentConfig?.app_key ? `${currentConfig.app_key.slice(0, 8)}...` : '-'}
          </p>
          {currentToken ? (
            <>
              <p style={{ color: 'var(--muted-foreground)' }}>
                토큰 유형: {currentToken.token_type}
              </p>
              <p style={{ color: 'var(--muted-foreground)' }}>만료까지: {timeRemaining}</p>
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
