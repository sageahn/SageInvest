import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { AccountRepository } from '@/lib/kis/account-repository';
import { query } from '@/lib/db';

describe('AccountRepository (SPEC-KIS-002)', () => {
  const testEncryptionKey = 'a'.repeat(64);
  let repository: AccountRepository;

  beforeAll(() => {
    process.env.KIS_ENCRYPTION_KEY = testEncryptionKey;
    repository = new AccountRepository();
  });

  beforeEach(async () => {
    // 각 테스트 전에 계좌 설정 삭제
    await query('DELETE FROM kis_account_settings');
  });

  describe('saveAccountSettings', () => {
    it('should save valid account settings', async () => {
      const cano = '12345678';
      const acntPrdtCd = '01';

      const result = await repository.saveAccountSettings(cano, acntPrdtCd);

      expect(result).toBeDefined();
      expect(result.cano_encrypted).toBeDefined();
      expect(result.acnt_prdt_cd_encrypted).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should validate CANO format (8 digits)', async () => {
      await expect(repository.saveAccountSettings('1234567', '01')).rejects.toThrow(
        'CANO must be exactly 8 digits'
      );
    });

    it('should validate ACNT_PRDT_CD format (2 digits)', async () => {
      await expect(repository.saveAccountSettings('12345678', '1')).rejects.toThrow(
        'ACNT_PRDT_CD must be exactly 2 digits'
      );
    });

    it('should replace existing account settings', async () => {
      // 첫 번째 저장
      await repository.saveAccountSettings('12345678', '01');

      // 두 번째 저장 (기존 설정을 덮어써야 함)
      const result = await repository.saveAccountSettings('87654321', '02');

      expect(result).toBeDefined();
    });
  });

  describe('getAccountSettings', () => {
    it('should return null when no settings exist', async () => {
      const result = await repository.getAccountSettings();
      expect(result).toBeNull();
    });

    it('should return saved account settings', async () => {
      await repository.saveAccountSettings('12345678', '01');

      const result = await repository.getAccountSettings();

      expect(result).toBeDefined();
      expect(result!.cano_encrypted).toBeDefined();
      expect(result!.acnt_prdt_cd_encrypted).toBeDefined();
    });
  });

  describe('getDecryptedAccount', () => {
    it('should return null when no settings exist', async () => {
      const result = await repository.getDecryptedAccount();
      expect(result).toBeNull();
    });

    it('should return decrypted account data', async () => {
      const cano = '12345678';
      const acntPrdtCd = '01';

      await repository.saveAccountSettings(cano, acntPrdtCd);

      const result = await repository.getDecryptedAccount();

      expect(result).toBeDefined();
      expect(result!.cano).toBe(cano);
      expect(result!.acntPrdtCd).toBe(acntPrdtCd);
    });
  });

  describe('deleteAccountSettings', () => {
    it('should delete existing account settings', async () => {
      await repository.saveAccountSettings('12345678', '01');

      await repository.deleteAccountSettings();

      const result = await repository.getAccountSettings();
      expect(result).toBeNull();
    });

    it('should handle delete when no settings exist', async () => {
      // 에러를 발생시키지 않아야 함
      await expect(repository.deleteAccountSettings()).resolves.not.toThrow();
    });
  });
});
