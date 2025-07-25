import { ENC_KEY, HASH_SECRET } from '@/config/env';
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(ENC_KEY, 'hex'); // 32 bytes for AES-256
const IV_LENGTH = 16; // AES block size (16 bytes)

/**
 * Generate an HMAC-SHA256 hash of a given string using a secret key.
 * @param value The plain text string to hash
 * @param secret Optional override for the hash secret
 */
export function hashString(value: string, secret: string = HASH_SECRET): string {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

/**
 * Encrypt a string using AES-256-CBC. Returns a combined string in the format: iv:ciphertext
 * @param value The plain text string to encrypt
 * @param key Optional override for the encryption key
 */
export function encryptString(value: string, key: Buffer = ENCRYPTION_KEY): string {
  console.log(ENC_KEY, key);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt an AES-256-CBC encrypted string in the format iv:ciphertext
 * @param encrypted Combined encrypted string (iv:ciphertext)
 * @param key Optional override for the encryption key
 */
export function decryptString(encrypted: string, key: Buffer = ENCRYPTION_KEY): string {
  const [ivHex, encryptedHex] = encrypted.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted.toString('utf8');
}
