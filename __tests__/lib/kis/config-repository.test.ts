import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigRepository } from '@/lib/kis/config-repository';
import { query } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/kis/crypto';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/kis/crypto', () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}));

describe('ConfigRepository', () => {
  let configRepository: ConfigRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    configRepository = new ConfigRepository();
  });

  const appKey = 'test_app_key';
  const appSecret = 'test_app_secret';
  const environment = 'production';

  describe('saveConfig', () => {
    it('should encrypt appKey and appSecret before saving', async () => {
      const encryptedKey = 'encrypted_key';
      const encryptedSecret = 'encrypted_secret';
      vi.mocked(encrypt).mockImplementation((text) => {
        if (text === appKey) return encryptedKey;
        if (text === appSecret) return encryptedSecret;
        return '';
      });
      vi.mocked(query).mockResolvedValue({ rows: [] }); // Assume no existing config

      await configRepository.saveConfig(appKey, appSecret, environment);

      // Check if encrypt was called correctly
      expect(encrypt).toHaveBeenCalledWith(appKey);
      expect(encrypt).toHaveBeenCalledWith(appSecret);

      // Check if the database query was called with encrypted data
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO kis_configs'),
        [encryptedKey, encryptedSecret, environment]
      );
    });
  });

  describe('getConfig', () => {
    it('should decrypt appKey and appSecret after retrieving', async () => {
      const encryptedKey = 'encrypted_key';
      const encryptedSecret = 'encrypted_secret';
      const mockDbRow = {
        id: 'mock-id',
        app_key: encryptedKey,
        app_secret_encrypted: encryptedSecret,
        environment: 'production',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const decryptedKey = 'decrypted_key';
      const decryptedSecret = 'decrypted_secret';

      vi.mocked(query).mockResolvedValue({ rows: [mockDbRow] });
      vi.mocked(decrypt).mockImplementation((text) => {
        if (text === encryptedKey) return decryptedKey;
        if (text === encryptedSecret) return decryptedSecret;
        return '';
      });

      const config = await configRepository.getConfig();

      // Check that decrypt was called with the encrypted data
      expect(decrypt).toHaveBeenCalledWith(encryptedKey);
      expect(decrypt).toHaveBeenCalledWith(encryptedSecret);

      // Check that the final returned object has decrypted data
      expect(config?.app_key).toBe(decryptedKey);
      expect(config?.app_secret).toBe(decryptedSecret);
    });

    it('should return null if no config is found', async () => {
        vi.mocked(query).mockResolvedValue({ rows: [] });
  
        const config = await configRepository.getConfig();
  
        expect(config).toBeNull();
        expect(decrypt).not.toHaveBeenCalled();
    });
  });
});
