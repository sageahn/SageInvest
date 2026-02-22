// KIS Account Settings Repository
// SPEC-KIS-002: 계좌번호 설정 관리
import { query } from '../db';
import type { KISAccountSettings } from './types';
import { encrypt, decrypt } from './crypto';

/**
 * 계좌 설정 레포지토리
 * 데이터베이스에서 계좌 설정을 조회/저장/수정
 */
export class AccountRepository {
  /**
   * 계좌 설정 조회
   */
  async getAccountSettings(): Promise<KISAccountSettings | null> {
    const result = await query(
      'SELECT id, cano_encrypted, acnt_prdt_cd_encrypted, created_at, updated_at FROM kis_account_settings ORDER BY created_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * 계좌 설정 저장 (암호화)
   */
  async saveAccountSettings(cano: string, acntPrdtCd: string): Promise<KISAccountSettings> {
    // 입력값 검증
    if (!/^\d{8}$/.test(cano)) {
      throw new Error('CANO must be exactly 8 digits');
    }
    if (!/^\d{2}$/.test(acntPrdtCd)) {
      throw new Error('ACNT_PRDT_CD must be exactly 2 digits');
    }

    // 암호화
    const canoEncrypted = encrypt(cano);
    const acntPrdtCdEncrypted = encrypt(acntPrdtCd);

    // 기존 설정 삭제 (단일 계좌 설정 제약조건)
    await query('DELETE FROM kis_account_settings');

    // 새 설정 저장
    const result = await query(
      `INSERT INTO kis_account_settings (cano_encrypted, acnt_prdt_cd_encrypted)
       VALUES ($1, $2)
       RETURNING id, cano_encrypted, acnt_prdt_cd_encrypted, created_at, updated_at`,
      [canoEncrypted, acntPrdtCdEncrypted]
    );

    return result.rows[0];
  }

  /**
   * 계좌 설정 복호화
   */
  async getDecryptedAccount(): Promise<{ cano: string; acntPrdtCd: string } | null> {
    const settings = await this.getAccountSettings();
    if (!settings) {
      return null;
    }

    return {
      cano: decrypt(settings.cano_encrypted),
      acntPrdtCd: decrypt(settings.acnt_prdt_cd_encrypted),
    };
  }

  /**
   * 계좌 설정 삭제
   */
  async deleteAccountSettings(): Promise<void> {
    await query('DELETE FROM kis_account_settings');
  }
}

// 싱글톤 인스턴스
export const accountRepository = new AccountRepository();
