'use client';

import { useState } from 'react';
import RecentlyViewedTab from './RecentlyViewedTab';
import AllItemsTab from './AllItemsTab';

type TabKey = 'recent' | 'all' | 'groups';

interface Tab {
  key: TabKey;
  label: string;
  disabled?: boolean;
}

const tabs: Tab[] = [
  { key: 'recent', label: '최근 조회' },
  { key: 'all', label: '전체' },
  { key: 'groups', label: '그룹별', disabled: true },
];

/**
 * 관심종목 탭 네비게이션
 * Watchlist tab navigation component
 */
export default function WatchlistTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>('recent');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'recent':
        return <RecentlyViewedTab />;
      case 'all':
        return <AllItemsTab />;
      case 'groups':
        return (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-500">그룹 기능은 준비 중입니다</p>
            <p className="mt-2 text-sm text-gray-400">2차 업데이트에서 제공될 예정입니다</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setActiveTab(tab.key)}
              disabled={tab.disabled}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : tab.disabled
                      ? 'cursor-not-allowed border-transparent text-gray-300'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
              {tab.disabled && <span className="ml-2 text-xs text-gray-400">(준비중)</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="mt-6">{renderTabContent()}</div>
    </div>
  );
}
