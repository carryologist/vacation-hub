import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getSecret(): Buffer | null {
  const secret = process.env.VACATION_HUB_SECRET;
  if (!secret) return null;
  // Derive a 32-byte key from the secret
  const { createHash } = require('crypto');
  return createHash('sha256').update(secret).digest();
}

export function hasSecret(): boolean {
  return !!process.env.VACATION_HUB_SECRET;
}

export function encrypt(plaintext: string): string {
  const key = getSecret();
  if (!key) throw new Error('No VACATION_HUB_SECRET set');
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = getSecret();
  if (!key) throw new Error('No VACATION_HUB_SECRET set');
  const [ivHex, tagHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
