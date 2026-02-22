// KIS Moving Average Comparison API Route
// SPEC-KIS-003: 단일 종목 이동평균선 비교 분석
import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/lib/kis/config-repository';
import { KISMovingAverageService } from '@/lib/kis/moving-average-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockCode = searchParams.get('stockCode');
    const stockName = searchParams.get('stockName') || '';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    // 종목코드 필수 확인
    if (!stockCode) {
      return NextResponse.json(
        { error: '종목코드(stockCode)는 필수 파라미터입니다' },
        { status: 400 }
      );
    }

    // 종목코드 형식 검사 (6자리 숫자)
    if (!/^\d{6}$/.test(stockCode)) {
      return NextResponse.json({ error: '종목코드는 6자리 숫자여야 합니다' }, { status: 400 });
    }

    // KIS 설정 확인
    const config = await configRepository.getConfig();
    if (!config) {
      return NextResponse.json({ error: 'KIS 연동이 필요합니다' }, { status: 400 });
    }

    // 이동평균선 서비스 생성
    const appKey = config.app_key;
    const appSecret = config.app_secret;
    const maService = new KISMovingAverageService(config.environment, appKey, appSecret);

    // 이동평균선 비교 분석
    const comparison = await maService.compareSingleStock(stockCode, stockName, forceRefresh);

    return NextResponse.json({
      success: true,
      data: comparison,
      cached: !forceRefresh,
      fetchedAt: comparison.lastUpdated,
    });
  } catch (error: any) {
    console.error('Moving average comparison failed:', error);

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

    return NextResponse.json({ error: '이동평균선 비교 분석에 실패했습니다' }, { status: 500 });
  }
}
