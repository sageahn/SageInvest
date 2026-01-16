import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '@/lib/kis/crypto';

describe('Crypto Utils', () => {
  const testEncryptionKey = 'a'.repeat(64); // 64 hex chars = 32 bytes

  beforeAll(() => {
    process.env.KIS_ENCRYPTION_KEY = testEncryptionKey;
  });

  describe('encrypt', () => {
    it('should encrypt plaintext string', () => {
      const plaintext = 'my_secret_value';
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');
    });

    it('should produce different ciphertext for same input', () => {
      const plaintext = 'same_input';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('');
      expect(encrypted).toBeDefined();
    });

    it('should throw error without encryption key', () => {
      delete process.env.KIS_ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow();

      process.env.KIS_ENCRYPTION_KEY = testEncryptionKey;
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted value', () => {
      const plaintext = 'my_secret_value';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'special!@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '한글测试αβγδε';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid ciphertext', () => {
      expect(() => decrypt('invalid_ciphertext')).toThrow();
    });

    it('should throw error without encryption key', () => {
      delete process.env.KIS_ENCRYPTION_KEY;

      expect(() => decrypt('valid_encrypted_value')).toThrow();

      process.env.KIS_ENCRYPTION_KEY = testEncryptionKey;
    });
  });

  describe('encrypt-decrypt roundtrip', () => {
    it('should maintain data integrity through encryption cycle', () => {
      const testData = [
        'simple_string',
        'string with spaces',
        'string\nwith\nnewlines',
        'string\twith\ttabs',
        'a'.repeat(1000), // long string
        JSON.stringify({ key: 'value', nested: { data: 123 } }), // JSON
      ];

      testData.forEach((original) => {
        const encrypted = encrypt(original);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(original);
      });
    });
  });
});
