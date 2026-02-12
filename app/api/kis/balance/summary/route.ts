// KIS Balance Summary API Route
// SPEC-KIS-006: 자산 요약만 조회 (대시보드 위젯용, 경량)
import { NextResponse } from 'next/server';
import { accountRepository } from '@/lib/kis/account-repository';
import { KISBalanceService } from '@/lib/kis/balance-service';
import { configRepository } from '@/lib/kis/config-repository';

export async function GET() {
  try {
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
    const appKey = config.app_key;

    const balanceService = new KISBalanceService(config.environment, appKey, appSecret);

    // 4. 계좌 요약만 조회 (경량)
    const summary = await balanceService.getAccountSummary(account.cano, account.acntPrdtCd);

    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Balance summary inquiry failed:', error);

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

    return NextResponse.json({ error: '자산요약 조회에 실패했습니다' }, { status: 500 });
  }
}
