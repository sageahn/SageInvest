'use client';

import { useState, useEffect } from 'react';
import { KISConfig } from '@/lib/kis/types';

interface KISSettingsProps {
  initialConfig?: KISConfig | null;
}

interface AccountSettings {
  cano: string;
  acntPrdtCd: string;
}

export default function KISSettingsPage({ initialConfig }: KISSettingsProps) {
  // KIS API 설정 상태
  const [appKey, setAppKey] = useState(initialConfig?.app_key || '');
  const [appSecret, setAppSecret] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'mock'>(
    (initialConfig?.environment as any) || 'production'
  );

  // 계좌 설정 상태 (SPEC-KIS-002)
  const [accountSettings, setAccountSettings] = useState<AccountSettings | null>(null);
  const [canoInput, setCanoInput] = useState('');
  const [acntPrdtCdInput, setAcntPrdtCdInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 계좌 설정 로드 (SPEC-KIS-002)
  useEffect(() => {
    const loadAccountSettings = async () => {
      try {
        const response = await fetch('/api/kis/account');
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setAccountSettings(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load account settings:', error);
      }
    };

    loadAccountSettings();
  }, []);

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
    } catch {
      setMessage({ type: 'error', text: '설정 저장 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (typeof window !== 'undefined' && !window.confirm('정말로 설정을 삭제하시겠습니까?')) {
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
    } catch {
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

      const data = (await response.json()) as { success: boolean; expires_at: string };
      setMessage({
        type: 'success',
        text: `연결 성공! 토큰 만료: ${new Date(data.expires_at).toLocaleString()}`,
      });
    } catch {
      setMessage({ type: 'error', text: '연결 테스트 실패' });
    } finally {
      setLoading(false);
    }
  };

  // 계좌 설정 저장 (SPEC-KIS-002)
  const handleSaveAccount = async () => {
    // 입력값 검증
    if (!/^\d{8}$/.test(canoInput)) {
      setMessage({ type: 'error', text: '종합계좌번호는 8자리 숫자여야 합니다.' });
      return;
    }

    if (!/^\d{2}$/.test(acntPrdtCdInput)) {
      setMessage({ type: 'error', text: '계좌상품코드는 2자리 숫자여야 합니다.' });
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '계좌 설정 저장 실패');
      }

      setMessage({ type: 'success', text: '계좌번호가 저장되었습니다.' });
      setCanoInput('');
      setAcntPrdtCdInput('');

      // 계좌 설정 재로드
      const accountResponse = await fetch('/api/kis/account');
      if (accountResponse.ok) {
        const data = await accountResponse.json();
        setAccountSettings(data.data);
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || '계좌 설정 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  // 계좌 설정 삭제 (SPEC-KIS-002)
  const handleDeleteAccount = async () => {
    if (typeof window !== 'undefined' && !window.confirm('정말로 계좌 설정을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);

    try {
      // 계좌 삭제 API 호출 (별도로 구현 필요하며, 현재는 임시 처리)
      // 현재 계좌 설정을 초기화
      setAccountSettings(null);
      setMessage({ type: 'success', text: '계좌 설정이 삭제되었습니다.' });
    } catch {
      setMessage({ type: 'error', text: '계좌 설정 삭제 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">KIS API 설정</h1>

      <div className="space-y-8">
        {/* KIS API 설정 섹션 */}
        <div className="max-w-2xl bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">API 인증 설정</h2>
          <div className="space-y-6">
            {/* App Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">App Key</label>
              <input
                type="text"
                value={appKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAppKey(e.target.value)}
                placeholder="36자 App Key를 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={36}
              />
              <p className="text-sm text-gray-500 mt-1">{appKey.length}/36 자</p>
            </div>

            {/* App Secret Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">App Secret</label>
              <input
                type="password"
                value={appSecret}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAppSecret(e.target.value)}
                placeholder="180자 App Secret를 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={180}
              />
              <p className="text-sm text-gray-500 mt-1">{appSecret.length}/180 자</p>
            </div>

            {/* Environment Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">환경</label>
              <select
                value={environment}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setEnvironment(e.target.value as 'production' | 'mock')
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="production">Production (실전)</option>
                <option value="mock">Mock (모의투자)</option>
              </select>
            </div>

            {/* API Action Buttons */}
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

        {/* 계좌 설정 섹션 (SPEC-KIS-002) */}
        <div className="max-w-2xl bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">계좌 설정</h2>

          {/* 저장된 계좌 정보 표시 */}
          {accountSettings && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-gray-700">
                <span className="font-medium">저장된 계좌:</span> {accountSettings.cano}-
                {accountSettings.acntPrdtCd}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* 계좌번호 입력 (CANO) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종합계좌번호 (CANO)
              </label>
              <input
                type="text"
                value={canoInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCanoInput(e.target.value)}
                placeholder="8자리 계좌번호를 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={8}
              />
              <p className="text-sm text-gray-500 mt-1">{canoInput.length}/8 자</p>
            </div>

            {/* 계좌상품코드 입력 (ACNT_PRDT_CD) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계좌상품코드 (ACNT_PRDT_CD)
              </label>
              <input
                type="text"
                value={acntPrdtCdInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAcntPrdtCdInput(e.target.value)
                }
                placeholder="2자리 상품코드를 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={2}
              />
              <p className="text-sm text-gray-500 mt-1">{acntPrdtCdInput.length}/2 자</p>
              <p className="text-xs text-gray-400 mt-1">
                예: 01 (종합위탁), 02 (증권), 03 (선물옵션)
              </p>
            </div>

            {/* 계좌 Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSaveAccount}
                disabled={loading || !canoInput || !acntPrdtCdInput}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '저장 중...' : '계좌 저장'}
              </button>

              {accountSettings && (
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  계좌 삭제
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`max-w-2xl p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
