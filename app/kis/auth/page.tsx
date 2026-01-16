'use client';

import { useState, useEffect } from 'react';
import { KISAuthToken, KISConfig } from '@/lib/kis/types';

export default function KISAuthPage() {
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'mock'>('production');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentConfig, setCurrentConfig] = useState<KISConfig | null>(null);
  const [currentToken, setCurrentToken] = useState<KISAuthToken | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    fetchCurrentStatus();
    const interval = setInterval(fetchCurrentStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentToken?.expires_at) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = new Date(currentToken.expires_at).getTime() - now.getTime();

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
  }, [currentToken]);

  const fetchCurrentStatus = async () => {
    try {
      const [configRes, tokenRes] = await Promise.all([
        fetch('/api/kis/config'),
        fetch('/api/kis/status'),
      ]);

      if (configRes.ok) {
        const config = await configRes.json();
        setCurrentConfig(config);
      }

      if (tokenRes.ok) {
        const data = await tokenRes.json();
        setCurrentToken(data.token);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const handleAuthenticate = async () => {
    if (appKey.length !== 36 || appSecret.length !== 180) {
      setMessage({ type: 'error', text: 'AppKey(36자)와 AppSecret(180자)를 정확히 입력해주세요.' });
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

      if (!response.ok) {
        throw new Error('인증 실패');
      }

      const data = await response.json();
      setCurrentToken(data.token);
      setMessage({ type: 'success', text: '인증 성공! 토큰이 발급되었습니다.' });
      setAppSecret('');
    } catch (error) {
      setMessage({ type: 'error', text: '인증 실패. 설정을 확인해주세요.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/kis/refresh', { method: 'POST' });

      if (!response.ok) {
        throw new Error('토큰 갱신 실패');
      }

      const data = await response.json();
      setCurrentToken(data.token);
      setMessage({ type: 'success', text: '토큰이 갱신되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '토큰 갱신 실패' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">KIS API 인증</h1>

      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">인증 정보 입력</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Key
              </label>
              <input
                type="text"
                value={appKey}
                onChange={(e) => setAppKey(e.target.value)}
                placeholder="36자 App Key"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                maxLength={36}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Secret
              </label>
              <input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="180자 App Secret"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                maxLength={180}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                환경
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="production">Production (실전)</option>
                <option value="mock">Mock (모의투자)</option>
              </select>
            </div>

            {message && (
              <div
                className={`p-3 rounded-md ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              onClick={handleAuthenticate}
              disabled={loading || !appKey || !appSecret}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '인증 중...' : '인증하기'}
            </button>
          </div>
        </div>

        {/* Current Connection Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">현재 연결 정보</h2>

          {currentConfig ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">App Key:</span>
                <span className="font-mono text-sm">{currentConfig.app_key.substring(0, 8)}...</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">환경:</span>
                <span>{currentConfig.environment}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">상태:</span>
                <span className="text-green-600 font-medium">구성됨</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">구성된 설정이 없습니다</p>
          )}

          <hr className="my-4" />

          {currentToken ? (
            <div className="space-y-3">
              <h3 className="font-medium">토큰 정보</h3>

              <div className="flex justify-between">
                <span className="text-gray-600">유형:</span>
                <span>{currentToken.token_type}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">만료까지:</span>
                <span className={timeRemaining === '만료됨' ? 'text-red-600' : 'text-green-600'}>
                  {timeRemaining}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">발급시간:</span>
                <span className="text-sm">
                  {new Date(currentToken.expires_at).toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '갱신 중...' : '토큰 갱신'}
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">발급된 토큰이 없습니다</p>
              <a
                href="/kis/settings"
                className="inline-block px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                설정 페이지로
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
