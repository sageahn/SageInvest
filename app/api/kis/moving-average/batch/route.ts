// KIS Moving Average Batch Comparison API Route
// SPEC-KIS-003: 다중 종목 이동평균선 비교 분석 (배치 처리)
import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/lib/kis/config-repository';
import { KISMovingAverageService } from '@/lib/kis/moving-average-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stockCodes, stockNames } = body as {
      stockCodes: string[];
      stockNames?: Record<string, string>;
    };

    // 종목코드 배열 필수 확인
    if (!stockCodes || !Array.isArray(stockCodes)) {
      return NextResponse.json(
        { error: '종목코드 배열(stockCodes)은 필수입니다' },
        { status: 400 }
      );
    }

    // 종목코드 개수 제한 (한 번에 최대 100개)
    if (stockCodes.length > 100) {
      return NextResponse.json(
        { error: '한 번에 최대 100개 종목까지 조회 가능합니다' },
        { status: 400 }
      );
    }

    // 종목코드 형식 검사
    const invalidCodes = stockCodes.filter((code) => !/^\d{6}$/.test(code));
    if (invalidCodes.length > 0) {
      return NextResponse.json(
        { error: `유효하지 않은 종목코드: ${invalidCodes.join(', ')}` },
        { status: 400 }
      );
    }

    // KIS 설정 확인
    const config = await configRepository.getConfig();
    if (!config) {
      return NextResponse.json({ error: 'KIS 연동이 필요합니다' }, { status: 400 });
    }

    // 이동평균선 서비스 생성
    const appKey = config.app_key;
    const maService = new KISMovingAverageService(config.environment, appKey);

    // 배치 처리로 다중 종목 분석
    const comparisons = await maService.compareMultipleStocks(stockCodes, stockNames || {});

    return NextResponse.json({
      success: true,
      data: comparisons,
      requestedCount: stockCodes.length,
      processedCount: comparisons.length,
      fetchedAt: new Date(),
    });
  } catch (error: any) {
    console.error('Moving average batch comparison failed:', error);

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

    return NextResponse.json({ error: '이동평균선 배치 분석에 실패했습니다' }, { status: 500 });
  }
}
