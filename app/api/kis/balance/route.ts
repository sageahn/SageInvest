// KIS Balance Inquiry API Route
// SPEC-KIS-006: 계좌 잔고 전체 조회 (종목 목록 + 자산 요약)
import { NextRequest, NextResponse } from 'next/server';
import { accountRepository } from '@/lib/kis/account-repository';
import { KISBalanceService } from '@/lib/kis/balance-service';
import { configRepository } from '@/lib/kis/config-repository';

export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터: forceRefresh (선택사항)
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    // 1. 계좌 설정 확인
    const account = await accountRepository.getDecryptedAccount();
    if (!account) {
      return NextResponse.json({ error: '계좌번호를 설정해주세요' }, { status: 400 });
    }

    // 2. KIS 설정 확인
    const config = await configRepository.getConfig();
    if (!config) {
      return NextResponse.json({ error: 'KIS 연동이 필요합니다' }, { status: 400 });
    }

    // 3. 잔고 조회 서비스 생성
    const { app_secret: appSecret } = config;
    const appKey = config.app_key; // 이미 복호화된 상태

    const balanceService = new KISBalanceService(config.environment, appKey, appSecret);

    // 4. 잔고 조회
    const balance = await balanceService.getBalance(account.cano, account.acntPrdtCd, forceRefresh);

    return NextResponse.json({ success: true, data: balance });
  } catch (error: any) {
    console.error('Balance inquiry failed:', error);

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

    return NextResponse.json({ error: '잔고조회에 실패했습니다' }, { status: 500 });
  }
}
