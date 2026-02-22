// Portfolio Screening API Route
// SPEC-SCREENING-001: 포트폴리오 기반 이동평균선 돌파 스크리닝
import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/lib/kis/config-repository';
import { KISBalanceService } from '@/lib/kis/balance-service';
import { MASScreeningService } from '@/lib/screening/screening-service';
import { DEFAULT_MA_PERIOD, SUPPORTED_MA_PERIODS } from '@/lib/screening/types';
import type { MAPeriod } from '@/lib/screening/types';

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await request.json();
    const { cano, acntPrdtCd, maPeriod } = body;

    // 필수 파라미터 검증
    if (!cano || !acntPrdtCd) {
      return NextResponse.json(
        { error: '종합계좌번호(cano)와 계좌상품코드(acntPrdtCd)는 필수입니다' },
        { status: 400 }
      );
    }

    // 계좌번호 형식 검증
    if (!/^\d{8}$/.test(cano)) {
      return NextResponse.json({ error: '종합계좌번호는 8자리 숫자여야 합니다' }, { status: 400 });
    }

    if (!/^\d{2}$/.test(acntPrdtCd)) {
      return NextResponse.json({ error: '계좌상품코드는 2자리 숫자여야 합니다' }, { status: 400 });
    }

    // MA 기간 검증 (선택사항)
    const period: MAPeriod = maPeriod || DEFAULT_MA_PERIOD;
    if (!SUPPORTED_MA_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: `지원하지 않는 MA 기간입니다. 지원 기간: ${SUPPORTED_MA_PERIODS.join(', ')}` },
        { status: 400 }
      );
    }

    // KIS 설정 확인
    const config = await configRepository.getConfig();
    if (!config) {
      return NextResponse.json({ error: 'KIS 연동이 필요합니다' }, { status: 400 });
    }

    // 서비스 인스턴스 생성
    const appKey = config.app_key;
    const balanceService = new KISBalanceService(config.environment, appKey);
    const screeningService = new MASScreeningService(config.environment, appKey);

    // 1. 계좌 잔고에서 보유 종목 조회
    const balance = await balanceService.getBalance(cano, acntPrdtCd);

    if (!balance.stocks || balance.stocks.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          summary: {
            totalStocks: 0,
            breakthroughCount: 0,
            averageReturnRate: 0,
            screenedAt: new Date(),
            maPeriod: period,
          },
        },
        message: '보유 종목이 없습니다',
      });
    }

    // 2. 보유 종목에 대한 스크리닝 수행
    const holdings = balance.stocks.map((stock) => ({
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      quantity: stock.quantity,
      avgPrice: stock.avgPrice,
      currentPrice: stock.currentPrice,
      evaluationAmount: stock.evaluationAmount,
      returnRate: stock.returnRate,
    }));

    const screeningResponse = await screeningService.screenPortfolio(holdings, period);

    return NextResponse.json({
      success: true,
      data: screeningResponse,
    });
  } catch (error: unknown) {
    // Portfolio screening failed

    // KIS API 오류 처리
    if (error.response?.status === 401) {
      return NextResponse.json(
        { error: 'KIS 인증이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    if (error.response?.status === 429) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    // 계좌 관련 오류
    if (error.message?.includes('계좌')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: '포트폴리오 스크리닝에 실패했습니다' }, { status: 500 });
  }
}
