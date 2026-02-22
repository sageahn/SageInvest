import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenRepository } from '@/lib/kis/token-repository';
import { query } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/kis/crypto';
import type { KISAuthToken } from '@/lib/kis/types';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/kis/crypto', () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}));

describe('TokenRepository', () => {
  let tokenRepository: TokenRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    tokenRepository = new TokenRepository();
  });

  const mockToken: KISAuthToken = {
    access_token: 'plaintext_token',
    token_type: 'Bearer',
    expires_in: 86400,
    expires_at: new Date(Date.now() + 86400 * 1000),
  };

  describe('saveToken', () => {
    it('should encrypt the access token before saving', async () => {
      const encryptedToken = 'encrypted_token_string';
      vi.mocked(encrypt).mockReturnValue(encryptedToken);
      vi.mocked(query).mockResolvedValue({ rows: [] }); // Assume no existing token

      await tokenRepository.saveToken(mockToken, 'production');

      // 1. Check if encrypt was called with the plaintext token
      expect(encrypt).toHaveBeenCalledWith('plaintext_token');

      // 2. Check if the database query was called with the encrypted token
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO kis_tokens'),
        expect.arrayContaining([encryptedToken])
      );
    });

    it('should call UPDATE with encrypted token if token already exists', async () => {
        const encryptedToken = 'encrypted_token_string';
        vi.mocked(encrypt).mockReturnValue(encryptedToken);
        // Mock getToken to return an existing token
        vi.spyOn(tokenRepository, 'getToken').mockResolvedValue(mockToken);
  
        await tokenRepository.saveToken(mockToken, 'production');
  
        expect(encrypt).toHaveBeenCalledWith('plaintext_token');
        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE kis_tokens'),
          expect.arrayContaining([encryptedToken])
        );
      });
  });

  describe('getToken', () => {
    it('should decrypt the access token after retrieving', async () => {
      const encryptedToken = 'encrypted_token_string';
      const mockDbRow = {
        access_token: encryptedToken,
        token_type: 'Bearer',
        expires_in: 86400,
        expires_at: new Date(),
      };
      vi.mocked(query).mockResolvedValue({ rows: [mockDbRow] });
      vi.mocked(decrypt).mockReturnValue('decrypted_plaintext_token');

      const token = await tokenRepository.getToken('production');

      // 1. Check that the raw encrypted token was passed to decrypt
      expect(decrypt).toHaveBeenCalledWith(encryptedToken);

      // 2. Check that the final returned token has the decrypted value
      expect(token?.access_token).toBe('decrypted_plaintext_token');
    });

    it('should return null if no token is found', async () => {
        vi.mocked(query).mockResolvedValue({ rows: [] });
  
        const token = await tokenRepository.getToken('production');
  
        expect(token).toBeNull();
        expect(decrypt).not.toHaveBeenCalled();
      });
  });

  describe('isTokenExpired', () => {
    it('should return true if token is expiring within one hour', async () => {
        const expiringToken = { ...mockToken, expires_at: new Date(Date.now() + 30 * 60 * 1000) }; // expires in 30 mins
        vi.spyOn(tokenRepository, 'getToken').mockResolvedValue(expiringToken);

        const isExpired = await tokenRepository.isTokenExpired('production');

        expect(isExpired).toBe(true);
    });

    it('should return false if token is not expiring soon', async () => {
        const validToken = { ...mockToken, expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000) }; // expires in 2 hours
        vi.spyOn(tokenRepository, 'getToken').mockResolvedValue(validToken);

        const isExpired = await tokenRepository.isTokenExpired('production');

        expect(isExpired).toBe(false);
    });
  });
});
