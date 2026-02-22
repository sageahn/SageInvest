// Single Stock Screening API Route
// SPEC-SCREENING-001: 단일 종목 이동평균선 돌파 스크리닝
import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/lib/kis/config-repository';
import { MASScreeningService } from '@/lib/screening/screening-service';
import { DEFAULT_MA_PERIOD, SUPPORTED_MA_PERIODS, isValidStockCode } from '@/lib/screening/types';
import type { MAPeriod } from '@/lib/screening/types';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 동적 라우트 파라미터 추출
    const { code } = await params;

    // 종목코드 형식 검증
    if (!isValidStockCode(code)) {
      return NextResponse.json({ error: '종목코드는 6자리 숫자여야 합니다' }, { status: 400 });
    }

    // 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const maPeriodParam = searchParams.get('maPeriod');

    // MA 기간 파싱 및 검증
    let maPeriod: MAPeriod = DEFAULT_MA_PERIOD;
    if (maPeriodParam) {
      const parsedPeriod = parseInt(maPeriodParam, 10);
      if (!SUPPORTED_MA_PERIODS.includes(parsedPeriod as MAPeriod)) {
        return NextResponse.json(
          { error: `지원하지 않는 MA 기간입니다. 지원 기간: ${SUPPORTED_MA_PERIODS.join(', ')}` },
          { status: 400 }
        );
      }
      maPeriod = parsedPeriod as MAPeriod;
    }

    // KIS 설정 확인
    const config = await configRepository.getConfig();
    if (!config) {
      return NextResponse.json({ error: 'KIS 연동이 필요합니다' }, { status: 400 });
    }

    // 스크리닝 서비스 생성
    const appKey = config.app_key;
    const appSecret = config.app_secret;
    const screeningService = new MASScreeningService(config.environment, appKey, appSecret);

    // 단일 종목 스크리닝 수행
    const result = await screeningService.screenSingleStock(code, maPeriod);

    if (!result) {
      return NextResponse.json({
        success: true,
        data: {
          result: null,
          message: '해당 종목은 돌파 조건을 만족하지 않습니다',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        result,
      },
    });
  } catch (error: unknown) {
    // Single stock screening failed

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

    // 종목코드 관련 오류
    if (error.message?.includes('유효하지 않은 종목코드')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: '단일 종목 스크리닝에 실패했습니다' }, { status: 500 });
  }
}
