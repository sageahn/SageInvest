'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 자동 갱신 폴링 훅
 * 일정 간격으로 콜백을 실행하며, 브라우저 탭이 비활성일 때 자동 일시정지
 *
 * @param callback - 폴링 시 실행할 비동기 함수
 * @param intervalMs - 폴링 간격 (밀리초)
 * @param enabled - 폴링 활성화 여부
 * @returns lastUpdated - 마지막 업데이트 시각
 * @returns resetTimer - 폴링 타이머 리셋 함수 (수동 새로고침 시 사용)
 */
export function usePolling(callback: () => Promise<void>, intervalMs: number, enabled: boolean) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRef = useRef(callback);

  // 콜백 레퍼런스 최신 상태 유지
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 인터벌 정리 유틸리티
  const clearPollingInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 인터벌 시작 유틸리티
  const startPollingInterval = useCallback(() => {
    clearPollingInterval();
    intervalRef.current = setInterval(async () => {
      try {
        await callbackRef.current();
        setLastUpdated(new Date());
      } catch {
        // 에러는 콜백 내부에서 처리
      }
    }, intervalMs);
  }, [intervalMs, clearPollingInterval]);

  // 수동 새로고침 후 타이머 리셋 (다음 폴링까지 intervalMs만큼 대기)
  const resetTimer = useCallback(() => {
    setLastUpdated(new Date());
    if (enabled && !document.hidden) {
      startPollingInterval();
    }
  }, [enabled, startPollingInterval]);

  // 폴링 인터벌 설정 및 해제
  useEffect(() => {
    if (!enabled) {
      clearPollingInterval();
      return;
    }

    // 탭이 보이는 상태일 때만 인터벌 시작
    if (!document.hidden) {
      startPollingInterval();
    }

    // 브라우저 탭 가시성 변화 감지
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 탭 비활성: 인터벌 중지
        clearPollingInterval();
      } else {
        // 탭 활성: 즉시 한 번 실행 후 인터벌 재시작
        callbackRef
          .current()
          .then(() => setLastUpdated(new Date()))
          .catch(() => {});
        startPollingInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearPollingInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, startPollingInterval, clearPollingInterval]);

  return { lastUpdated, resetTimer };
}
