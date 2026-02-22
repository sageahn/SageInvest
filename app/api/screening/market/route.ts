// Market Screening API Route
// SPEC-SCREENING-001: 시장 기반 이동평균선 돌파 스크리닝
import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/lib/kis/config-repository';
import { MASScreeningService } from '@/lib/screening/screening-service';
import {
  DEFAULT_MA_PERIOD,
  SUPPORTED_MA_PERIODS,
  MAX_SCREENING_STOCKS,
  isValidStockCode,
} from '@/lib/screening/types';
import type { MAPeriod } from '@/lib/screening/types';

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await request.json();
    const { stockCodes, maPeriod } = body;

    // 필수 파라미터 검증
    if (!stockCodes || !Array.isArray(stockCodes)) {
      return NextResponse.json(
        { error: '종목코드 리스트(stockCodes)는 필수입니다' },
        { status: 400 }
      );
    }

    // 종목코드 리스트 비어있는지 확인
    if (stockCodes.length === 0) {
      return NextResponse.json({ error: '종목코드 리스트가 비어있습니다' }, { status: 400 });
    }

    // 종목 수 제한 검사
    if (stockCodes.length > MAX_SCREENING_STOCKS) {
      return NextResponse.json(
        { error: `종목 수가 너무 많습니다. 최대 ${MAX_SCREENING_STOCKS}개까지 가능합니다.` },
        { status: 400 }
      );
    }

    // 종목코드 형식 검증
    const invalidCodes = stockCodes.filter((code) => !isValidStockCode(code));
    if (invalidCodes.length > 0) {
      return NextResponse.json(
        { error: `유효하지 않은 종목코드: ${invalidCodes.join(', ')}` },
        { status: 400 }
      );
    }

    // 중복 종목코드 제거
    const uniqueStockCodes = Array.from(new Set(stockCodes));

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

    // 스크리닝 서비스 생성
    const appKey = config.app_key;
    const screeningService = new MASScreeningService(config.environment, appKey);

    // 시장 스크리닝 수행
    const screeningResponse = await screeningService.screenMarket(uniqueStockCodes, period);

    return NextResponse.json({
      success: true,
      data: screeningResponse,
      meta: {
        requestedCount: stockCodes.length,
        uniqueCount: uniqueStockCodes.length,
        duplicatesRemoved: stockCodes.length - uniqueStockCodes.length,
      },
    });
  } catch (error: unknown) {
    // Market screening failed

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

    // 종목 수 제한 오류
    if (error.message?.includes('Too many stocks')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: '시장 스크리닝에 실패했습니다' }, { status: 500 });
  }
}
