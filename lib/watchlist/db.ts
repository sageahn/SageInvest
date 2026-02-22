// Watchlist Database Access Layer
// SPEC-WATCHLIST-001: 관심 종목 관리
import { query, transaction } from '../db';
import type { WatchlistItem, RecentlyViewedStock, WatchlistGroup } from './types';

/**
 * 관심종목 데이터베이스 레포지토리
 * Watchlist database operations
 */
export class WatchlistRepository {
  /**
   * 모든 관심종목 조회 (순서대로)
   */
  async getAllItems(): Promise<WatchlistItem[]> {
    const result = await query(
      `SELECT id, stock_code, stock_name, group_id, ordering, added_at
       FROM watchlist_items
       ORDER BY ordering ASC, added_at DESC`
    );

    return result.rows.map(this.mapRowToWatchlistItem);
  }

  /**
   * 특정 종목의 관심종목 여부 확인
   */
  async isWatchlistItem(stockCode: string): Promise<boolean> {
    const result = await query('SELECT 1 FROM watchlist_items WHERE stock_code = $1 LIMIT 1', [
      stockCode,
    ]);
    return result.rows.length > 0;
  }

  /**
   * 관심종목 추가
   */
  async addItem(stockCode: string, stockName: string): Promise<WatchlistItem> {
    // 종목코드 검증
    if (!/^\d{6}$/.test(stockCode)) {
      throw new Error('stockCode must be exactly 6 digits');
    }

    // 현재 최대 ordering 조회
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(ordering), -1) as max_order FROM watchlist_items'
    );
    const nextOrder = maxOrderResult.rows[0].max_order + 1;

    const result = await query(
      `INSERT INTO watchlist_items (stock_code, stock_name, ordering)
       VALUES ($1, $2, $3)
       ON CONFLICT (stock_code) DO UPDATE SET stock_name = $2
       RETURNING id, stock_code, stock_name, group_id, ordering, added_at`,
      [stockCode, stockName, nextOrder]
    );

    return this.mapRowToWatchlistItem(result.rows[0]);
  }

  /**
   * 관심종목 삭제
   */
  async removeItem(id: number): Promise<void> {
    await query('DELETE FROM watchlist_items WHERE id = $1', [id]);
  }

  /**
   * 종목코드로 관심종목 삭제
   */
  async removeItemByCode(stockCode: string): Promise<void> {
    await query('DELETE FROM watchlist_items WHERE stock_code = $1', [stockCode]);
  }

  /**
   * 관심종목 순서 변경
   */
  async reorderItems(itemIds: number[]): Promise<void> {
    if (itemIds.length === 0) return;

    // 트랜잭션으로 순서 변경 원자성 보장
    await transaction(async (client) => {
      for (let i = 0; i < itemIds.length; i++) {
        await client.query('UPDATE watchlist_items SET ordering = $1 WHERE id = $2', [
          i,
          itemIds[i],
        ]);
      }
    });
  }

  /**
   * 최근 조회 종목 목록 (최신 50개)
   */
  async getRecentlyViewed(limit: number = 50): Promise<RecentlyViewedStock[]> {
    const result = await query(
      `SELECT id, stock_code, stock_name, viewed_at
       FROM recently_viewed
       ORDER BY viewed_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(this.mapRowToRecentlyViewed);
  }

  /**
   * 최근 조회 종목 추가 또는 업데이트
   */
  async addRecentlyViewed(stockCode: string, stockName: string): Promise<RecentlyViewedStock> {
    // 종목코드 검증
    if (!/^\d{6}$/.test(stockCode)) {
      throw new Error('stockCode must be exactly 6 digits');
    }

    const result = await query(
      `INSERT INTO recently_viewed (stock_code, stock_name)
       VALUES ($1, $2)
       ON CONFLICT (stock_code) DO UPDATE SET
         stock_name = $2,
         viewed_at = NOW()
       RETURNING id, stock_code, stock_name, viewed_at`,
      [stockCode, stockName]
    );

    return this.mapRowToRecentlyViewed(result.rows[0]);
  }

  /**
   * 최근 조회 종목 삭제
   */
  async removeRecentlyViewed(stockCode: string): Promise<void> {
    await query('DELETE FROM recently_viewed WHERE stock_code = $1', [stockCode]);
  }

  /**
   * 최근 조회 기록 전체 삭제
   */
  async clearRecentlyViewed(): Promise<void> {
    await query('DELETE FROM recently_viewed');
  }

  // ============================================================================
  // Group Methods (for future 2nd milestone)
  // ============================================================================

  /**
   * 모든 그룹 조회
   */
  async getAllGroups(): Promise<WatchlistGroup[]> {
    const result = await query(
      `SELECT id, name, ordering, created_at, updated_at
       FROM watchlist_groups
       ORDER BY ordering ASC`
    );

    return result.rows.map(this.mapRowToWatchlistGroup);
  }

  /**
   * 그룹별 관심종목 조회
   */
  async getItemsByGroup(groupId: number): Promise<WatchlistItem[]> {
    const result = await query(
      `SELECT id, stock_code, stock_name, group_id, ordering, added_at
       FROM watchlist_items
       WHERE group_id = $1
       ORDER BY ordering ASC, added_at DESC`,
      [groupId]
    );

    return result.rows.map(this.mapRowToWatchlistItem);
  }

  // ============================================================================
  // Mapping Helpers
  // ============================================================================

  private mapRowToWatchlistItem(row: any): WatchlistItem {
    return {
      id: row.id,
      stockCode: row.stock_code,
      stockName: row.stock_name,
      groupId: row.group_id,
      ordering: row.ordering,
      addedAt: row.added_at,
    };
  }

  private mapRowToRecentlyViewed(row: any): RecentlyViewedStock {
    return {
      id: row.id,
      stockCode: row.stock_code,
      stockName: row.stock_name,
      viewedAt: row.viewed_at,
    };
  }

  private mapRowToWatchlistGroup(row: any): WatchlistGroup {
    return {
      id: row.id,
      name: row.name,
      ordering: row.ordering,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// 싱글톤 인스턴스
export const watchlistRepository = new WatchlistRepository();
