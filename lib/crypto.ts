// lib/crypto.ts
// ─── Capa de Encriptación E2EE de GastOS ─────────────────────────────────────
//
// CONTRATO:
//   encryptData(valor)  → string cifrado listo para guardar en Supabase
//   decryptData(cipher) → string/número en claro listo para usar en UI
//
// REGLA DE ORO:
//   - Nunca guardar en Supabase sin pasar por encryptData()
//   - Nunca mostrar en UI sin pasar por decryptData()
//   - Los objetos en el estado React siempre están en CLARO

import CryptoJS from 'crypto-js'

const STORAGE_KEY       = 'gastos_master_vault_key'
const VERIFICATION_TEXT = 'GASTOS_VALID_V1'

// ─── Derivación de clave ──────────────────────────────────────────────────────
export function deriveKeyFromPin(pin: string, userId: string): string {
  const salt       = CryptoJS.enc.Hex.parse(userId.replace(/-/g, ''))
  const derivedKey = CryptoJS.PBKDF2(pin, salt, {
    keySize:    256 / 32,
    iterations: 1000,
  })
  return derivedKey.toString()
}

// ─── Gestión de la clave maestra en sesión ────────────────────────────────────
// Usamos sessionStorage: la clave se borra al cerrar la pestaña → más seguro

export function saveKey(key: string): void {
  sessionStorage.setItem(STORAGE_KEY, key)
}

export function getMasterKey(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(STORAGE_KEY)
}

export function clearKey(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

// ─── Verificación de vault ────────────────────────────────────────────────────

export function generateVerificationToken(key: string): string {
  return CryptoJS.AES.encrypt(VERIFICATION_TEXT, key).toString()
}

export function isKeyValid(key: string, tokenFromDB: string): boolean {
  try {
    const bytes     = CryptoJS.AES.decrypt(tokenFromDB, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted === VERIFICATION_TEXT
  } catch {
    return false
  }
}

// ─── Cifrado / Descifrado de datos ───────────────────────────────────────────
//
// encryptData: acepta string o number, devuelve string cifrado.
//   Si no hay clave disponible o el valor es vacío, devuelve '' (fallo silencioso).
//
// decryptData: acepta string o number (para manejar valores ya en claro de BD legacy).
//   Si el valor no parece estar cifrado (no empieza por 'U2FsdGVkX1'),
//   lo devuelve tal cual para mantener retrocompatibilidad.

export function encryptData(text: string | number): string {
  const key = getMasterKey()
  if (!key || text === null || text === undefined || text === '') return ''
  return CryptoJS.AES.encrypt(text.toString(), key).toString()
}

export function decryptData(cipherText: string | number): string {
  const key = getMasterKey()
  if (!key || cipherText === null || cipherText === undefined || cipherText === '') return ''
  const textString = cipherText.toString()
  // Si no tiene el prefijo de AES cifrado, asumimos que está en claro (legacy)
  if (!textString.startsWith('U2FsdGVkX1')) return textString
  try {
    const bytes        = CryptoJS.AES.decrypt(textString, key)
    const originalText = bytes.toString(CryptoJS.enc.Utf8)
    return originalText || textString
  } catch {
    return textString
  }
}