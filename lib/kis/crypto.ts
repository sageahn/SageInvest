// AES-256-GCM Encryption/Decryption Utilities
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.KIS_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('KIS_ENCRYPTION_KEY environment variable is not set');
  }
  if (keyHex.length !== 64) {
    throw new Error('KIS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: salt(iv)(authTag)(encrypted)
  const result = `${salt.toString('hex')}${iv.toString('hex')}${authTag.toString('hex')}${encrypted}`;
  return result;
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  const saltHex = ciphertext.slice(0, SALT_LENGTH * 2);
  const ivHex = ciphertext.slice(SALT_LENGTH * 2, (SALT_LENGTH + IV_LENGTH) * 2);
  const authTagHex = ciphertext.slice(
    (SALT_LENGTH + IV_LENGTH) * 2,
    (SALT_LENGTH + IV_LENGTH + TAG_LENGTH) * 2
  );
  const encrypted = ciphertext.slice((SALT_LENGTH + IV_LENGTH + TAG_LENGTH) * 2);

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
