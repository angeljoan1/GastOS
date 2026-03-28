// lib/crypto.ts
// ─── Capa de Encriptación E2EE de GastOS ─────────────────────────────────────
//
// CONTRATO:
//   encryptData(valor)  → string cifrado listo para guardar en Supabase
//   decryptData(cipher) → string en claro listo para usar en UI
//
// ARQUITECTURA:
//   - Web Crypto API nativa del navegador (sin CryptoJS)
//   - PBKDF2-SHA256 con 300.000 iteraciones
//   - AES-GCM (cifrado autenticado — detecta manipulación del ciphertext)
//   - Salt aleatorio de 16 bytes, generado al crear el vault, guardado en BD
//   - CryptoKey guardada en memoria del módulo (nunca serializada, se pierde al cerrar pestaña)
//
// REGLA DE ORO:
//   - Nunca guardar en Supabase sin pasar por encryptData()
//   - Nunca mostrar en UI sin pasar por decryptData()
//   - Los objetos en el estado React siempre están en CLARO

// ─── Estado interno del módulo ────────────────────────────────────────────────
// La CryptoKey nativa vive aquí. No se exporta, no va a sessionStorage.
// Se pierde al cerrar la pestaña → el usuario debe introducir el PIN de nuevo.
let _masterKey: CryptoKey | null = null

const STORAGE_KEY       = 'gastos_master_vault_key_v2'  // versión nueva, no colisiona con CryptoJS
const VERIFICATION_TEXT = 'GASTOS_VALID_V2'

// ─── Generación de salt ───────────────────────────────────────────────────────
// Llamar una sola vez al crear el vault. Devuelve base64 para guardar en BD.
export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

function saltFromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

// ─── Derivación de clave ──────────────────────────────────────────────────────
// salt: Uint8Array generado con generateSalt() y recuperado de BD.
// Devuelve una CryptoKey AES-GCM lista para usar.
export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  // Copia con buffer propio: TS infiere Uint8Array<ArrayBufferLike> y no encaja con BufferSource de subtle.
  const saltBytes = new Uint8Array(salt)

  return crypto.subtle.deriveKey(
    {
      name:       'PBKDF2',
      salt:       saltBytes,
      iterations: 300_000,
      hash:       'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,          // no exportable
    ['encrypt', 'decrypt'],
  )
}

// ─── Gestión de la clave maestra en sesión ────────────────────────────────────
// saveKey: recibe la CryptoKey derivada y la guarda en el módulo.
// También guarda un flag en sessionStorage para saber si la sesión está activa
// (la CryptoKey en sí NO se puede serializar — solo el flag).
export function saveKey(key: CryptoKey): void {
  _masterKey = key
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, '1')
  }
}

export function getMasterKey(): CryptoKey | null {
  return _masterKey
}

// Indica si hay una sesión activa (flag en sessionStorage + key en memoria).
// En recarga de pestaña: sessionStorage tiene '1' pero _masterKey es null → false.
export function hasActiveSession(): boolean {
  if (typeof window === 'undefined') return false
  return _masterKey !== null && sessionStorage.getItem(STORAGE_KEY) === '1'
}

export function clearKey(): void {
  _masterKey = null
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

// ─── Verificación de vault ────────────────────────────────────────────────────
// Cifra el texto de verificación con la clave derivada.
// El token resultante se guarda en BD y permite verificar el PIN sin guardar la clave.
export async function generateVerificationToken(key: CryptoKey): Promise<string> {
  const enc = new TextEncoder()
  const iv  = crypto.getRandomValues(new Uint8Array(12))

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(VERIFICATION_TEXT),
  )

  // Formato: base64(iv) + '.' + base64(ciphertext)
  const ivB64   = btoa(String.fromCharCode(...iv))
  const ctB64   = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
  return `${ivB64}.${ctB64}`
}

export async function isKeyValid(key: CryptoKey, tokenFromDB: string): Promise<boolean> {
  try {
    const [ivB64, ctB64] = tokenFromDB.split('.')
    if (!ivB64 || !ctB64) return false

    const iv         = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )

    const dec = new TextDecoder()
    return dec.decode(plainBuffer) === VERIFICATION_TEXT
  } catch {
    return false
  }
}

// ─── Cifrado / Descifrado de datos ────────────────────────────────────────────
//
// encryptData: acepta string o number, devuelve string cifrado (base64 iv + '.' + base64 ct).
//   Si no hay clave disponible o el valor es vacío, devuelve '' (fallo silencioso).
//   SÍNCRONO hacia fuera: usa _masterKey en memoria. Internamente lanza una
//   micro-task via un truco de sincronización — ver nota abajo.
//
// NOTA TÉCNICA: Web Crypto API es async, pero queremos mantener la API síncrona
// para no tener que convertir en async todos los handlers de IngresoTab, HistorialTab, etc.
// La solución: usamos XMLHttpRequest síncrono vacío para "drenar" la microtask queue,
// lo que no es posible en workers pero sí en el main thread de un navegador moderno.
// Alternativa más limpia si en el futuro se quiere refactorizar: hacer encryptData async
// y usar Promise.all en los inserts de Supabase.
//
// IMPLEMENTACIÓN REAL: dado que XMLHttpRequest síncrono está deprecated y causa
// warnings, usamos una aproximación diferente: encryptData y decryptData son en
// realidad async internamente pero exponemos versiones síncronas que operan sobre
// un buffer de resultados pre-calculados. Esto no es viable en el navegador.
//
// DECISIÓN FINAL: mantenemos encryptData/decryptData como funciones que devuelven
// string directamente usando una implementación XOR+base64 como fallback NO — 
// La solución correcta es: hacerlas async. El impacto en cascada es mínimo
// porque los únicos sitios donde se llaman son dentro de funciones async
// (handleGuardar, handleImport, handleCobrarSub, etc.) que ya usan await.
// Solo hay que añadir await delante de encryptData/decryptData en esos sitios.
//
// Los componentes afectados son: IngresoTab, HistorialTab, CuentasModal,
// ImportCSVModal, DashboardTab, page.tsx — todos ya tienen funciones async.

export async function encryptData(text: string | number): Promise<string> {
  const key = _masterKey
  if (!key || text === null || text === undefined || text === '') return ''

  const enc = new TextEncoder()
  const iv  = crypto.getRandomValues(new Uint8Array(12))

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(text.toString()),
  )

  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
  return `${ivB64}.${ctB64}`
}

export async function decryptData(cipherText: string | number): Promise<string> {
  const key = _masterKey
  if (!key || cipherText === null || cipherText === undefined || cipherText === '') return ''

  const textString = cipherText.toString()

  // Datos legacy de CryptoJS (prefijo antiguo) o datos en claro: devolver tal cual.
  // Tras el vaciado de BD esto no debería aparecer, pero lo mantenemos como guardia.
  if (!textString.includes('.') || textString.startsWith('U2FsdGVkX1')) {
    return textString
  }

  try {
    const [ivB64, ctB64] = textString.split('.')
    if (!ivB64 || !ctB64) return textString

    const iv         = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
    const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )

    return new TextDecoder().decode(plainBuffer)
  } catch {
    // AES-GCM falla si el ciphertext fue manipulado → devolvemos vacío, no el cifrado
    return ''
  }
}