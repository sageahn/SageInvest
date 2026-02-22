import { describe, it, expect, vi, beforeEach } from 'vitest';

// 모듈 레벨 mock 함수 (KISAuthMiddleware 내부에서 사용)
const mockMakeRequest = vi.fn();

// 의존성 모킹: db (WatchlistRepository가 내부적으로 사용)
vi.mock('@/lib/watchlist/db', () => {
  const mockRepository = {
    getAllItems: vi.fn(),
    isWatchlistItem: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    reorderItems: vi.fn(),
    getRecentlyViewed: vi.fn(),
    addRecentlyViewed: vi.fn(),
    removeRecentlyViewed: vi.fn(),
    clearRecentlyViewed: vi.fn(),
  };
  return {
    watchlistRepository: mockRepository,
    WatchlistRepository: vi.fn(() => mockRepository),
  };
});

// KIS configRepository 모킹
vi.mock('@/lib/kis/config-repository', () => ({
  configRepository: {
    getConfig: vi.fn(),
  },
}));

// KISAuthMiddleware 모킹 - class 구문 사용 (new 연산자 호환)
vi.mock('@/lib/kis/auth-middleware', () => {
  return {
    KISAuthMiddleware: class MockKISAuthMiddleware {
      makeRequest = mockMakeRequest;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_environment: string, _appKey: string, _appSecret: string) {
        // Mock constructor
      }
    },
  };
});

import { WatchlistService } from '@/lib/watchlist/service';
import { watchlistRepository } from '@/lib/watchlist/db';
import { configRepository } from '@/lib/kis/config-repository';

describe('WatchlistService', () => {
  let service: WatchlistService;

  // KIS 초기화 헬퍼: configRepository 모킹
  const setupKIS = (environment: 'production' | 'mock' = 'mock') => {
    vi.mocked(configRepository.getConfig).mockResolvedValue({
      id: 1,
      app_key: 'test-app-key',
      app_secret: 'test-app-secret',
      environment,
      created_at: new Date(),
      updated_at: new Date(),
    });
  };

  // KIS API 현재가 응답 생성 헬퍼
  const createPriceResponse = (overrides: Record<string, string> = {}) => ({
    data: {
      rt_cd: '0',
      msg_cd: 'MCA00000',
      msg1: '정상처리 되었습니다.',
      output: {
        stck_prpr: '70000', // 현재가
        prdy_vrss: '1000', // 전일대비
        prdy_vrss_sign: '2', // 상승
        prdy_ctrt: '1.45', // 전일대비율
        stck_oprc: '69500', // 시가
        stck_sdpr: '69000', // 전일종가
        stck_hgpr: '71000', // 고가
        stck_lwpr: '69000', // 저가
        acml_vol: '15000000', // 거래량
        hts_kor_isnm: '삼성전자', // 종목명
        ...overrides,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // 새로운 서비스 인스턴스 생성 (private 상태 초기화)
    service = new WatchlistService();
  });

  // ============================================================================
  // 관심종목 CRUD
  // ============================================================================

  describe('addToWatchlist - 관심종목 추가', () => {
    it('repository를 통해 관심종목을 추가한다', async () => {
      const mockItem = {
        id: 1,
        stockCode: '005930',
        stockName: '삼성전자',
        groupId: null,
        ordering: 0,
        addedAt: new Date(),
      };
      vi.mocked(watchlistRepository.addItem).mockResolvedValue(mockItem);

      const result = await service.addToWatchlist('005930', '삼성전자');

      expect(watchlistRepository.addItem).toHaveBeenCalledWith('005930', '삼성전자');
      expect(result).toEqual(mockItem);
    });
  });

  describe('removeFromWatchlist - 관심종목 삭제', () => {
    it('repository를 통해 ID로 관심종목을 삭제한다', async () => {
      vi.mocked(watchlistRepository.removeItem).mockResolvedValue(undefined);

      await service.removeFromWatchlist(1);

      expect(watchlistRepository.removeItem).toHaveBeenCalledWith(1);
    });
  });

  describe('reorderWatchlist - 관심종목 순서 변경', () => {
    it('repository를 통해 순서를 변경한다', async () => {
      vi.mocked(watchlistRepository.reorderItems).mockResolvedValue(undefined);

      await service.reorderWatchlist([3, 1, 2]);

      expect(watchlistRepository.reorderItems).toHaveBeenCalledWith([3, 1, 2]);
    });
  });

  describe('isInWatchlist - 관심종목 여부 확인', () => {
    it('관심종목에 포함된 경우 true를 반환한다', async () => {
      vi.mocked(watchlistRepository.isWatchlistItem).mockResolvedValue(true);

      const result = await service.isInWatchlist('005930');

      expect(watchlistRepository.isWatchlistItem).toHaveBeenCalledWith('005930');
      expect(result).toBe(true);
    });

    it('관심종목에 포함되지 않은 경우 false를 반환한다', async () => {
      vi.mocked(watchlistRepository.isWatchlistItem).mockResolvedValue(false);

      const result = await service.isInWatchlist('999999');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // 관심종목 목록 + 현재가 조회
  // ============================================================================

  describe('getAllWatchlistWithPrices - 관심종목 + 현재가 조회', () => {
    it('관심종목이 없으면 빈 배열을 반환한다', async () => {
      vi.mocked(watchlistRepository.getAllItems).mockResolvedValue([]);

      const result = await service.getAllWatchlistWithPrices();

      expect(result).toEqual([]);
      // KIS API는 호출하지 않아야 한다
      expect(mockMakeRequest).not.toHaveBeenCalled();
    });

    it('관심종목에 현재가 정보를 결합하여 반환한다', async () => {
      // 관심종목 데이터
      vi.mocked(watchlistRepository.getAllItems).mockResolvedValue([
        {
          id: 1,
          stockCode: '005930',
          stockName: '삼성전자',
          groupId: null,
          ordering: 0,
          addedAt: new Date(),
        },
      ]);

      // KIS API 설정
      setupKIS();
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      const result = await service.getAllWatchlistWithPrices();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        changeAmount: 1000,
        changeRate: 1.45,
        priceDirection: 'up',
        isInWatchlist: true, // 관심종목 목록이므로 항상 true
      });
    });

    it('가격 하락 시 priceDirection이 down이다', async () => {
      vi.mocked(watchlistRepository.getAllItems).mockResolvedValue([
        {
          id: 1,
          stockCode: '005930',
          stockName: '삼성전자',
          groupId: null,
          ordering: 0,
          addedAt: new Date(),
        },
      ]);

      setupKIS();
      mockMakeRequest.mockResolvedValue(
        createPriceResponse({
          prdy_vrss: '-500',
          prdy_ctrt: '-0.72',
        })
      );

      const result = await service.getAllWatchlistWithPrices();

      expect(result[0].priceDirection).toBe('down');
      expect(result[0].changeAmount).toBe(-500);
    });

    it('가격 변동 없으면 priceDirection이 unchanged이다', async () => {
      vi.mocked(watchlistRepository.getAllItems).mockResolvedValue([
        {
          id: 1,
          stockCode: '005930',
          stockName: '삼성전자',
          groupId: null,
          ordering: 0,
          addedAt: new Date(),
        },
      ]);

      setupKIS();
      mockMakeRequest.mockResolvedValue(
        createPriceResponse({
          prdy_vrss: '0',
          prdy_ctrt: '0',
        })
      );

      const result = await service.getAllWatchlistWithPrices();

      expect(result[0].priceDirection).toBe('unchanged');
    });
  });

  // ============================================================================
  // 최근 조회 종목
  // ============================================================================

  describe('addToRecentlyViewed - 최근 조회 종목 추가', () => {
    it('repository를 통해 최근 조회 종목을 추가한다', async () => {
      const mockRecent = {
        id: 1,
        stockCode: '005930',
        stockName: '삼성전자',
        viewedAt: new Date(),
      };
      vi.mocked(watchlistRepository.addRecentlyViewed).mockResolvedValue(mockRecent);

      const result = await service.addToRecentlyViewed('005930', '삼성전자');

      expect(watchlistRepository.addRecentlyViewed).toHaveBeenCalledWith('005930', '삼성전자');
      expect(result).toEqual(mockRecent);
    });
  });

  describe('clearRecentlyViewed - 최근 조회 전체 삭제', () => {
    it('repository를 통해 모든 최근 조회 기록을 삭제한다', async () => {
      vi.mocked(watchlistRepository.clearRecentlyViewed).mockResolvedValue(undefined);

      await service.clearRecentlyViewed();

      expect(watchlistRepository.clearRecentlyViewed).toHaveBeenCalled();
    });
  });

  describe('getRecentlyViewedWithPrices - 최근 조회 종목 + 현재가 조회', () => {
    it('최근 조회 종목이 없으면 빈 배열을 반환한다', async () => {
      vi.mocked(watchlistRepository.getRecentlyViewed).mockResolvedValue([]);

      const result = await service.getRecentlyViewedWithPrices();

      expect(result).toEqual([]);
    });

    it('최근 조회 종목에 현재가와 관심종목 여부를 결합하여 반환한다', async () => {
      // 최근 조회 종목 데이터
      vi.mocked(watchlistRepository.getRecentlyViewed).mockResolvedValue([
        { id: 1, stockCode: '005930', stockName: '삼성전자', viewedAt: new Date() },
      ]);

      // KIS API 설정
      setupKIS();
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      // 관심종목 여부: true
      vi.mocked(watchlistRepository.isWatchlistItem).mockResolvedValue(true);

      const result = await service.getRecentlyViewedWithPrices(10);

      expect(watchlistRepository.getRecentlyViewed).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        isInWatchlist: true,
      });
    });

    it('관심종목이 아닌 최근 조회 종목은 isInWatchlist가 false이다', async () => {
      vi.mocked(watchlistRepository.getRecentlyViewed).mockResolvedValue([
        { id: 1, stockCode: '035720', stockName: '카카오', viewedAt: new Date() },
      ]);

      setupKIS();
      mockMakeRequest.mockResolvedValue(
        createPriceResponse({
          hts_kor_isnm: '카카오',
        })
      );

      // 관심종목 여부: false
      vi.mocked(watchlistRepository.isWatchlistItem).mockResolvedValue(false);

      const result = await service.getRecentlyViewedWithPrices();

      expect(result[0].isInWatchlist).toBe(false);
    });

    it('기본 limit 값은 50이다', async () => {
      vi.mocked(watchlistRepository.getRecentlyViewed).mockResolvedValue([]);

      await service.getRecentlyViewedWithPrices();

      expect(watchlistRepository.getRecentlyViewed).toHaveBeenCalledWith(50);
    });
  });

  // ============================================================================
  // KIS API 단일 종목 현재가 조회
  // ============================================================================

  describe('getStockPrice - 단일 종목 현재가 조회', () => {
    it('KIS API를 통해 현재가를 조회한다', async () => {
      setupKIS();
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      const result = await service.getStockPrice('005930', '삼성전자');

      // makeRequest가 올바른 파라미터로 호출되었는지 확인
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          needsAuth: true,
          headers: expect.objectContaining({
            tr_id: 'VHKST01010100', // mock 환경
            custtype: 'P',
          }),
        })
      );

      expect(result).toMatchObject({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        previousClose: 69000, // stck_sdpr 값
        changeAmount: 1000,
        changeRate: 1.45,
      });
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('production 환경에서 올바른 TR_ID를 사용한다', async () => {
      setupKIS('production');
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      await service.getStockPrice('005930');

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            tr_id: 'FHKST01010100', // production 환경
          }),
        })
      );
    });

    it('production 환경에서 올바른 Base URL을 사용한다', async () => {
      setupKIS('production');
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      await service.getStockPrice('005930');

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('https://openapi.koreainvestment.com:9443'),
        })
      );
    });

    it('mock 환경에서 올바른 Base URL을 사용한다', async () => {
      setupKIS('mock');
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      await service.getStockPrice('005930');

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('https://openapivts.koreainvestment.com:29443'),
        })
      );
    });

    it('KOSPI 종목코드(0, 1로 시작)는 시장코드 J를 사용한다', async () => {
      setupKIS();
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      await service.getStockPrice('005930'); // 0으로 시작

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('fid_cond_mrkt_div_code=J'),
        })
      );
    });

    it('KOSDAQ 종목코드(0, 1 외)는 시장코드 Q를 사용한다', async () => {
      setupKIS();
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      await service.getStockPrice('247540'); // 2로 시작

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('fid_cond_mrkt_div_code=Q'),
        })
      );
    });

    it('KIS API 에러 시 기본값(0)을 반환한다', async () => {
      setupKIS();
      mockMakeRequest.mockRejectedValue(new Error('Network Error'));

      const result = await service.getStockPrice('005930', '삼성전자');

      // 에러 시 fallback 값 반환
      expect(result).toMatchObject({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 0,
        previousClose: 0,
        changeAmount: 0,
        changeRate: 0,
      });
    });

    it('KIS API 에러 시 stockName이 없으면 stockCode를 사용한다', async () => {
      setupKIS();
      mockMakeRequest.mockRejectedValue(new Error('API Error'));

      const result = await service.getStockPrice('005930');

      expect(result.stockName).toBe('005930');
    });

    it('KIS 설정이 없으면 에러를 발생시킨다', async () => {
      vi.mocked(configRepository.getConfig).mockResolvedValue(null);

      await expect(service.getStockPrice('005930')).rejects.toThrow('KIS 연동이 필요합니다');
    });
  });

  // ============================================================================
  // KIS API 응답 변환 (transformPriceResponse)
  // ============================================================================

  describe('transformPriceResponse - KIS API 응답 변환', () => {
    it('stck_sdpr(전일종가)가 있으면 previousClose로 사용한다', async () => {
      setupKIS();
      mockMakeRequest.mockResolvedValue(
        createPriceResponse({
          stck_sdpr: '68000',
          stck_oprc: '69500',
        })
      );

      const result = await service.getStockPrice('005930');

      // stck_sdpr 값이 우선
      expect(result.previousClose).toBe(68000);
    });

    it('stck_sdpr가 없으면 stck_oprc(시가)를 previousClose로 사용한다', async () => {
      setupKIS();
      // stck_sdpr를 undefined로 설정
      const response = createPriceResponse();
      delete (response.data.output as any).stck_sdpr;
      mockMakeRequest.mockResolvedValue(response);

      const result = await service.getStockPrice('005930');

      // stck_oprc 값을 대체 사용
      expect(result.previousClose).toBe(69500); // stck_oprc 기본값
    });

    it('hts_kor_isnm(종목명)이 없으면 fallbackName을 사용한다', async () => {
      setupKIS();
      mockMakeRequest.mockResolvedValue(
        createPriceResponse({
          hts_kor_isnm: '',
        })
      );

      const result = await service.getStockPrice('005930', '폴백이름');

      expect(result.stockName).toBe('폴백이름');
    });

    it('hts_kor_isnm과 fallbackName 모두 없으면 빈 문자열이다', async () => {
      setupKIS();

      mockMakeRequest.mockResolvedValue(
        createPriceResponse({
          hts_kor_isnm: '',
        })
      );

      const result = await service.getStockPrice('005930');

      expect(result.stockName).toBe('');
    });

    it('숫자가 아닌 값은 0으로 변환한다', async () => {
      setupKIS();
      mockMakeRequest.mockResolvedValue(
        createPriceResponse({
          stck_prpr: 'NaN',
          prdy_vrss: '',
          prdy_ctrt: 'invalid',
        })
      );

      const result = await service.getStockPrice('005930');

      expect(result.currentPrice).toBe(0);
      expect(result.changeAmount).toBe(0);
      expect(result.changeRate).toBe(0);
    });

    it('파라미터에서 전달받은 stockCode를 사용한다 (API 응답 무시)', async () => {
      setupKIS();
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      const result = await service.getStockPrice('005930');

      // 응답의 종목코드가 아닌 파라미터의 stockCode 사용
      expect(result.stockCode).toBe('005930');
    });
  });

  // ============================================================================
  // 다중 종목 현재가 조회
  // ============================================================================

  describe('getMultiplePrices - 다중 종목 현재가 조회', () => {
    it('여러 종목의 현재가를 순차적으로 조회한다', async () => {
      setupKIS();
      mockMakeRequest
        .mockResolvedValueOnce(
          createPriceResponse({ hts_kor_isnm: '삼성전자', stck_prpr: '70000' })
        )
        .mockResolvedValueOnce(
          createPriceResponse({ hts_kor_isnm: 'SK하이닉스', stck_prpr: '180000' })
        );

      const result = await service.getMultiplePrices(
        ['005930', '000660'],
        ['삼성전자', 'SK하이닉스']
      );

      expect(result).toHaveLength(2);
      expect(result[0].stockCode).toBe('005930');
      expect(result[0].currentPrice).toBe(70000);
      expect(result[1].stockCode).toBe('000660');
      expect(result[1].currentPrice).toBe(180000);
    });

    it('개별 종목 실패 시 해당 종목만 기본값으로 반환한다 (전체 중단 안 함)', async () => {
      setupKIS();
      mockMakeRequest
        .mockResolvedValueOnce(createPriceResponse({ hts_kor_isnm: '삼성전자' }))
        .mockRejectedValueOnce(new Error('API Error')); // 두 번째 종목 실패

      const result = await service.getMultiplePrices(
        ['005930', '000660'],
        ['삼성전자', 'SK하이닉스']
      );

      expect(result).toHaveLength(2);

      // 첫 번째: 정상
      expect(result[0].currentPrice).toBe(70000);

      // 두 번째: 에러 -> 기본값 (getStockPrice 내부에서 catch)
      expect(result[1].stockCode).toBe('000660');
      expect(result[1].currentPrice).toBe(0);
    });

    it('stockNames가 없으면 stockCode를 이름으로 사용한다', async () => {
      setupKIS();
      mockMakeRequest.mockRejectedValue(new Error('API Error'));

      const result = await service.getMultiplePrices(['005930']);

      // stockNames 미제공 -> fallback은 stockCode
      expect(result[0].stockName).toBe('005930');
    });
  });

  // ============================================================================
  // KIS 초기화 (initializeKIS)
  // ============================================================================

  describe('initializeKIS - KIS 설정 초기화', () => {
    it('이미 초기화되었으면 재초기화하지 않는다', async () => {
      setupKIS();
      mockMakeRequest.mockResolvedValue(createPriceResponse());

      // 첫 번째 호출: 초기화 발생
      await service.getStockPrice('005930');
      expect(configRepository.getConfig).toHaveBeenCalledTimes(1);

      // 두 번째 호출: 이미 초기화 완료
      await service.getStockPrice('000660');
      // configRepository.getConfig는 여전히 1번만 호출됨 (캐시)
      expect(configRepository.getConfig).toHaveBeenCalledTimes(1);
    });
  });
});
