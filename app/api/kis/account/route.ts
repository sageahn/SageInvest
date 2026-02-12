// KIS Account Settings API Route
// SPEC-KIS-006: 계좌번호 저장/조회
import { NextRequest, NextResponse } from 'next/server';
import { accountRepository } from '@/lib/kis/account-repository';

/**
 * GET /api/kis/account
 * 저장된 계좌번호 조회 (마스킹 처리)
 */
export async function GET() {
  try {
    const account = await accountRepository.getDecryptedAccount();

    if (!account) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    // 계좌번호 마스킹 처리 (예: 12345678 -> "1234****")
    const maskedCano = account.cano.slice(0, 4) + '****';

    return NextResponse.json({
      success: true,
      data: {
        cano: maskedCano,
        acntPrdtCd: account.acntPrdtCd,
      },
    });
  } catch (error: any) {
    console.error('Account inquiry failed:', error);
    return NextResponse.json({ error: '계좌정보 조회에 실패했습니다' }, { status: 500 });
  }
}

/**
 * POST /api/kis/account
 * 계좌번호 저장 (암호화)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      cano: string;
      acntPrdtCd: string;
    };

    const { cano, acntPrdtCd } = body;

    // 입력값 검증
    if (!cano || !acntPrdtCd) {
      return NextResponse.json(
        { error: '계좌번호와 상품코드를 모두 입력해주세요' },
        { status: 400 }
      );
    }

    // 형식 검증 (repo에서도 수행하지만, 조기 에러 반환을 위해 여기서도 검증)
    if (!/^\d{8}$/.test(cano)) {
      return NextResponse.json({ error: '종합계좌번호는 8자리 숫자여야 합니다' }, { status: 400 });
    }

    if (!/^\d{2}$/.test(acntPrdtCd)) {
      return NextResponse.json({ error: '계좌상품코드는 2자리 숫자여야 합니다' }, { status: 400 });
    }

    // 계좌번호 저장 (암호화 포함)
    await accountRepository.saveAccountSettings(cano, acntPrdtCd);

    return NextResponse.json({
      success: true,
      message: '계좌번호가 저장되었습니다',
    });
  } catch (error: any) {
    console.error('Account save failed:', error);

    // 중복 저장 오류 처리
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 저장된 계좌번호가 있습니다' }, { status: 409 });
    }

    return NextResponse.json({ error: '계좌번호 저장에 실패했습니다' }, { status: 500 });
  }
}
