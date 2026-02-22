'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  /** 확인 버튼 라벨 (기본값: "삭제") */
  confirmLabel?: string;
  /** 취소 버튼 라벨 (기본값: "취소") */
  cancelLabel?: string;
}

/**
 * 삭제 확인 다이얼로그
 * Accessible modal dialog with focus trap, ESC close, and overlay click close
 */
export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = '삭제',
  cancelLabel = '취소',
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      // 포커스 트랩: Tab 키가 다이얼로그 내부에서만 순환하도록 처리
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: 첫 번째 요소에서 마지막 요소로 이동
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: 마지막 요소에서 첫 번째 요소로 이동
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (!isOpen) return;

    // 다이얼로그 열릴 때 취소 버튼에 포커스 (안전을 위해 취소가 기본)
    cancelButtonRef.current?.focus();

    // 키보드 이벤트 리스너 등록
    document.addEventListener('keydown', handleKeyDown);

    // 배경 스크롤 방지
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // 오버레이 클릭 시 닫기
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-dialog-title"
    >
      <div ref={dialogRef} className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* 제목 */}
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>

        {/* 메시지 */}
        <p className="mt-3 text-sm text-gray-600">{message}</p>

        {/* 버튼 영역 */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
