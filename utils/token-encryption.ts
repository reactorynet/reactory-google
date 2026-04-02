import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive a 32-byte encryption key from the master key and per-user salt using scrypt.
 */
function deriveKey(masterKey: string, salt: string): Buffer {
  return crypto.scryptSync(masterKey, salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string in the format: iv:authTag:ciphertext
 * 
 * @param plaintext - The string to encrypt
 * @param masterKey - The master encryption key (from GOOGLE_TOKEN_ENCRYPTION_KEY env var)
 * @param salt - Per-user random salt
 */
export function encryptToken(plaintext: string, masterKey: string, salt: string): string {
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8') as unknown as Uint8Array,
    cipher.final() as unknown as Uint8Array,
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a ciphertext string produced by encryptToken.
 * 
 * @param ciphertext - Base64-encoded string in format: iv:authTag:encrypted
 * @param masterKey - The master encryption key
 * @param salt - Per-user random salt
 */
export function decryptToken(ciphertext: string, masterKey: string, salt: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivB64, authTagB64, encryptedB64] = parts;
  const key = deriveKey(masterKey, salt);
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encryptedData = Buffer.from(encryptedB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData) as unknown as Uint8Array,
    decipher.final() as unknown as Uint8Array,
  ]);

  return decrypted.toString('utf8');
}

/**
 * Generate a random per-user salt for token encryption.
 */
export function generateEncryptionSalt(): string {
  return crypto.randomBytes(16).toString('base64');
}
