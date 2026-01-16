'use client';

import { useState } from 'react';
import { KISConfig } from '@/lib/kis/types';

interface KISSettingsProps {
  initialConfig?: KISConfig | null;
}

export default function KISSettingsPage({ initialConfig }: KISSettingsProps) {
  const [appKey, setAppKey] = useState(initialConfig?.app_key || '');
  const [appSecret, setAppSecret] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'mock'>(
    (initialConfig?.environment as any) || 'production'
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const validateForm = (): boolean => {
    if (appKey.length !== 36) {
      setMessage({ type: 'error', text: 'AppKey는 36자여야 합니다.' });
      return false;
    }

    if (appSecret.length !== 180) {
      setMessage({ type: 'error', text: 'AppSecret은 180자여야 합니다.' });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
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

      if (!response.ok) {
        throw new Error('설정 저장 실패');
      }

      setMessage({ type: 'success', text: 'KIS 설정이 저장되었습니다.' });
      setAppSecret('');
    } catch (error) {
      setMessage({ type: 'error', text: '설정 저장 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 설정을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/kis/config', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('설정 삭제 실패');
      }

      setAppKey('');
      setAppSecret('');
      setMessage({ type: 'success', text: '설정이 삭제되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '설정 삭제 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/kis/test', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('연결 테스트 실패');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: `연결 성공! 토큰 만료: ${new Date(data.expires_at).toLocaleString()}` });
    } catch (error) {
      setMessage({ type: 'error', text: '연결 테스트 실패' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">KIS API 설정</h1>

      <div className="max-w-2xl bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {/* App Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              App Key
            </label>
            <input
              type="text"
              value={appKey}
              onChange={(e) => setAppKey(e.target.value)}
              placeholder="36자 App Key를 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={36}
            />
            <p className="text-sm text-gray-500 mt-1">
              {appKey.length}/36 자
            </p>
          </div>

          {/* App Secret Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              App Secret
            </label>
            <input
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="180자 App Secret를 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={180}
            />
            <p className="text-sm text-gray-500 mt-1">
              {appSecret.length}/180 자
            </p>
          </div>

          {/* Environment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              환경
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as 'production' | 'mock')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="production">Production (실전)</option>
              <option value="mock">Mock (모의투자)</option>
            </select>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`p-4 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '저장'}
            </button>

            <button
              onClick={handleDelete}
              disabled={loading || !initialConfig}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              삭제
            </button>

            <button
              onClick={handleTestConnection}
              disabled={loading || !appKey}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              연결 테스트
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
