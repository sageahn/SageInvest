import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatchlistRepository } from '@/lib/watchlist/db';

// 의존성 모킹
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

import { query, transaction } from '@/lib/db';

describe('WatchlistRepository', () => {
  let repository: WatchlistRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new WatchlistRepository();
  });

  // ============================================================================
  // 관심종목 조회
  // ============================================================================

  describe('getAllItems - 모든 관심종목 조회', () => {
    it('DB에서 관심종목 목록을 순서대로 조회한다', async () => {
      const mockRows = [
        {
          id: 1,
          stock_code: '005930',
          stock_name: '삼성전자',
          group_id: null,
          ordering: 0,
          added_at: new Date('2024-01-01'),
        },
        {
          id: 2,
          stock_code: '000660',
          stock_name: 'SK하이닉스',
          group_id: null,
          ordering: 1,
          added_at: new Date('2024-01-02'),
        },
      ];
      vi.mocked(query).mockResolvedValue({ rows: mockRows });

      const result = await repository.getAllItems();

      // SQL 쿼리가 올바른지 확인
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, stock_code, stock_name, group_id, ordering, added_at')
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ordering ASC, added_at DESC')
      );

      // 결과 매핑이 올바른지 확인
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        stockCode: '005930',
        stockName: '삼성전자',
        groupId: null,
        ordering: 0,
        addedAt: new Date('2024-01-01'),
      });
      expect(result[1]).toEqual({
        id: 2,
        stockCode: '000660',
        stockName: 'SK하이닉스',
        groupId: null,
        ordering: 1,
        addedAt: new Date('2024-01-02'),
      });
    });

    it('관심종목이 없으면 빈 배열을 반환한다', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] });

      const result = await repository.getAllItems();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // 관심종목 여부 확인
  // ============================================================================

  describe('isWatchlistItem - 관심종목 여부 확인', () => {
    it('관심종목에 포함된 경우 true를 반환한다', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await repository.isWatchlistItem('005930');

      expect(query).toHaveBeenCalledWith(
        'SELECT 1 FROM watchlist_items WHERE stock_code = $1 LIMIT 1',
        ['005930']
      );
      expect(result).toBe(true);
    });

    it('관심종목에 포함되지 않은 경우 false를 반환한다', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] });

      const result = await repository.isWatchlistItem('999999');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // 관심종목 추가
  // ============================================================================

  describe('addItem - 관심종목 추가', () => {
    it('유효한 종목코드로 관심종목을 추가한다', async () => {
      // 첫 번째 쿼리: 최대 ordering 조회
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ max_order: 2 }] })
        // 두 번째 쿼리: INSERT
        .mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              stock_code: '035720',
              stock_name: '카카오',
              group_id: null,
              ordering: 3,
              added_at: new Date('2024-01-03'),
            },
          ],
        });

      const result = await repository.addItem('035720', '카카오');

      // 최대 ordering 조회 쿼리 확인
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT COALESCE(MAX(ordering), -1)')
      );

      // INSERT 쿼리 확인 (nextOrder = 2 + 1 = 3)
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO watchlist_items'),
        ['035720', '카카오', 3]
      );

      // 결과 매핑 확인
      expect(result).toEqual({
        id: 3,
        stockCode: '035720',
        stockName: '카카오',
        groupId: null,
        ordering: 3,
        addedAt: new Date('2024-01-03'),
      });
    });

    it('관심종목이 없을 때 ordering 0으로 추가한다', async () => {
      // max_order = -1 (COALESCE 기본값) -> nextOrder = 0
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ max_order: -1 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              stock_code: '005930',
              stock_name: '삼성전자',
              group_id: null,
              ordering: 0,
              added_at: new Date(),
            },
          ],
        });

      await repository.addItem('005930', '삼성전자');

      // ordering이 0인지 확인
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO watchlist_items'),
        ['005930', '삼성전자', 0]
      );
    });

    it('6자리 숫자가 아닌 종목코드는 에러를 발생시킨다', async () => {
      await expect(repository.addItem('12345', '유효하지않은종목')).rejects.toThrow(
        'stockCode must be exactly 6 digits'
      );

      await expect(repository.addItem('abcdef', '유효하지않은종목')).rejects.toThrow(
        'stockCode must be exactly 6 digits'
      );

      await expect(repository.addItem('1234567', '유효하지않은종목')).rejects.toThrow(
        'stockCode must be exactly 6 digits'
      );

      // query가 호출되지 않았는지 확인
      expect(query).not.toHaveBeenCalled();
    });

    it('ON CONFLICT로 중복 종목코드를 처리한다 (UPSERT)', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [{ max_order: 0 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              stock_code: '005930',
              stock_name: '삼성전자(업데이트)',
              group_id: null,
              ordering: 0,
              added_at: new Date(),
            },
          ],
        });

      await repository.addItem('005930', '삼성전자(업데이트)');

      // ON CONFLICT 구문이 포함된 INSERT 쿼리 확인
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ON CONFLICT (stock_code) DO UPDATE'),
        expect.any(Array)
      );
    });
  });

  // ============================================================================
  // 관심종목 삭제
  // ============================================================================

  describe('removeItem - ID로 관심종목 삭제', () => {
    it('ID로 관심종목을 삭제한다', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] });

      await repository.removeItem(1);

      expect(query).toHaveBeenCalledWith('DELETE FROM watchlist_items WHERE id = $1', [1]);
    });
  });

  describe('removeItemByCode - 종목코드로 관심종목 삭제', () => {
    it('종목코드로 관심종목을 삭제한다', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] });

      await repository.removeItemByCode('005930');

      expect(query).toHaveBeenCalledWith('DELETE FROM watchlist_items WHERE stock_code = $1', [
        '005930',
      ]);
    });
  });

  // ============================================================================
  // 관심종목 순서 변경
  // ============================================================================

  describe('reorderItems - 관심종목 순서 변경', () => {
    it('트랜잭션으로 순서를 변경한다', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };

      // transaction 모킹: 콜백을 실행하고 결과 반환
      vi.mocked(transaction).mockImplementation(async (callback: any) => {
        return await callback(mockClient);
      });

      const itemIds = [3, 1, 2];
      await repository.reorderItems(itemIds);

      // transaction이 호출되었는지 확인
      expect(transaction).toHaveBeenCalledTimes(1);

      // 각 아이템에 대해 UPDATE가 호출되었는지 확인
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'UPDATE watchlist_items SET ordering = $1 WHERE id = $2',
        [0, 3] // 첫 번째 아이템: ordering=0, id=3
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        'UPDATE watchlist_items SET ordering = $1 WHERE id = $2',
        [1, 1] // 두 번째 아이템: ordering=1, id=1
      );

      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        'UPDATE watchlist_items SET ordering = $1 WHERE id = $2',
        [2, 2] // 세 번째 아이템: ordering=2, id=2
      );
    });

    it('빈 배열이면 트랜잭션을 실행하지 않는다', async () => {
      await repository.reorderItems([]);

      expect(transaction).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 최근 조회 종목
  // ============================================================================

  describe('getRecentlyViewed - 최근 조회 종목 조회', () => {
    it('최근 조회 종목을 최신순으로 조회한다', async () => {
      const mockRows = [
        { id: 1, stock_code: '005930', stock_name: '삼성전자', viewed_at: new Date('2024-01-02') },
        {
          id: 2,
          stock_code: '000660',
          stock_name: 'SK하이닉스',
          viewed_at: new Date('2024-01-01'),
        },
      ];
      vi.mocked(query).mockResolvedValue({ rows: mockRows });

      const result = await repository.getRecentlyViewed(50);

      expect(query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY viewed_at DESC'), [50]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1'), [50]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        stockCode: '005930',
        stockName: '삼성전자',
        viewedAt: new Date('2024-01-02'),
      });
    });

    it('기본 limit 값은 50이다', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] });

      await repository.getRecentlyViewed();

      expect(query).toHaveBeenCalledWith(expect.any(String), [50]);
    });
  });

  describe('addRecentlyViewed - 최근 조회 종목 추가', () => {
    it('최근 조회 종목을 추가한다 (UPSERT)', async () => {
      const mockRow = {
        id: 1,
        stock_code: '005930',
        stock_name: '삼성전자',
        viewed_at: new Date('2024-01-01'),
      };
      vi.mocked(query).mockResolvedValue({ rows: [mockRow] });

      const result = await repository.addRecentlyViewed('005930', '삼성전자');

      // INSERT ... ON CONFLICT 쿼리 확인
      expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO recently_viewed'), [
        '005930',
        '삼성전자',
      ]);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (stock_code) DO UPDATE'),
        expect.any(Array)
      );

      expect(result).toEqual({
        id: 1,
        stockCode: '005930',
        stockName: '삼성전자',
        viewedAt: new Date('2024-01-01'),
      });
    });

    it('6자리 숫자가 아닌 종목코드는 에러를 발생시킨다', async () => {
      await expect(repository.addRecentlyViewed('ABC', '잘못된종목')).rejects.toThrow(
        'stockCode must be exactly 6 digits'
      );

      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('removeRecentlyViewed - 최근 조회 종목 삭제', () => {
    it('종목코드로 최근 조회 기록을 삭제한다', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] });

      await repository.removeRecentlyViewed('005930');

      expect(query).toHaveBeenCalledWith('DELETE FROM recently_viewed WHERE stock_code = $1', [
        '005930',
      ]);
    });
  });

  describe('clearRecentlyViewed - 최근 조회 전체 삭제', () => {
    it('모든 최근 조회 기록을 삭제한다', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] });

      await repository.clearRecentlyViewed();

      expect(query).toHaveBeenCalledWith('DELETE FROM recently_viewed');
    });
  });

  // ============================================================================
  // 그룹 메서드 (2차 마일스톤용)
  // ============================================================================

  describe('getAllGroups - 그룹 조회', () => {
    it('모든 그룹을 순서대로 조회한다', async () => {
      const mockRows = [
        {
          id: 1,
          name: '관심그룹1',
          ordering: 0,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
      ];
      vi.mocked(query).mockResolvedValue({ rows: mockRows });

      const result = await repository.getAllGroups();

      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM watchlist_groups'));
      expect(query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY ordering ASC'));

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: '관심그룹1',
        ordering: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });
    });
  });

  describe('getItemsByGroup - 그룹별 관심종목 조회', () => {
    it('특정 그룹의 관심종목을 조회한다', async () => {
      const mockRows = [
        {
          id: 1,
          stock_code: '005930',
          stock_name: '삼성전자',
          group_id: 1,
          ordering: 0,
          added_at: new Date(),
        },
      ];
      vi.mocked(query).mockResolvedValue({ rows: mockRows });

      const result = await repository.getItemsByGroup(1);

      expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE group_id = $1'), [1]);

      expect(result).toHaveLength(1);
      expect(result[0].stockCode).toBe('005930');
      expect(result[0].groupId).toBe(1);
    });
  });

  // ============================================================================
  // 에러 처리
  // ============================================================================

  describe('에러 처리', () => {
    it('DB 에러 발생 시 예외를 전파한다', async () => {
      vi.mocked(query).mockRejectedValue(new Error('Connection refused'));

      await expect(repository.getAllItems()).rejects.toThrow('Connection refused');
    });

    it('트랜잭션 에러 발생 시 예외를 전파한다', async () => {
      vi.mocked(transaction).mockRejectedValue(new Error('Deadlock detected'));

      await expect(repository.reorderItems([1, 2, 3])).rejects.toThrow('Deadlock detected');
    });
  });
});
