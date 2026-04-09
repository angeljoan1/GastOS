// __tests__/crypto.test.ts
// Tests de la capa de cifrado E2EE
// Nota: Web Crypto API está disponible en jsdom (Node 19+)

import { describe, it, expect, beforeAll } from "vitest"
import { generateSalt, deriveKeyFromPin, saveKey } from "@/lib/crypto"

// Necesitamos la clave derivada antes de testear encrypt/decrypt
// La importamos dinámicamente para asegurarnos de que saveKey ya corrió
async function setupKey(pin = "123456") {
  const saltBase64 = generateSalt()
  const saltBytes = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0))
  const key = await deriveKeyFromPin(pin, saltBytes)
  saveKey(key)
  return key
}

describe("generateSalt", () => {
  it("genera un string base64 no vacío", () => {
    const salt = generateSalt()
    expect(typeof salt).toBe("string")
    expect(salt.length).toBeGreaterThan(0)
  })

  it("genera valores distintos cada vez", () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(a).not.toBe(b)
  })

  it("decodifica a 16 bytes", () => {
    const salt = generateSalt()
    const bytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0))
    expect(bytes.length).toBe(16)
  })
})

describe("deriveKeyFromPin", () => {
  it("devuelve una CryptoKey", async () => {
    const salt = generateSalt()
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0))
    const key = await deriveKeyFromPin("123456", saltBytes)
    expect(key).toBeInstanceOf(CryptoKey)
  })

  it("el mismo PIN y salt producen la misma clave (determinista)", async () => {
    const salt = generateSalt()
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0))
    const k1 = await deriveKeyFromPin("123456", saltBytes)
    const k2 = await deriveKeyFromPin("123456", saltBytes)
    // CryptoKey no es comparable directamente, verificamos exportando
    const raw1 = await crypto.subtle.exportKey("raw", k1)
    const raw2 = await crypto.subtle.exportKey("raw", k2)
    expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2))
  })

  it("PINs distintos producen claves distintas", async () => {
    const salt = generateSalt()
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0))
    const k1 = await deriveKeyFromPin("111111", saltBytes)
    const k2 = await deriveKeyFromPin("999999", saltBytes)
    const raw1 = await crypto.subtle.exportKey("raw", k1)
    const raw2 = await crypto.subtle.exportKey("raw", k2)
    expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2))
  })
})

describe("encryptData / decryptData (round-trip)", () => {
  beforeAll(async () => {
    await setupKey("123456")
  })

  it("cifra y descifra un número correctamente", async () => {
    const { encryptData, decryptData } = await import("@/lib/crypto")
    const original = 99.95
    const cifrado = await encryptData(original)
    expect(typeof cifrado).toBe("string")
    const descifrado = await decryptData(cifrado)
    expect(parseFloat(descifrado)).toBeCloseTo(original, 5)
  })

  it("cifra y descifra un string correctamente", async () => {
    const { encryptData, decryptData } = await import("@/lib/crypto")
    const original = "Cena con Juan"
    const cifrado = await encryptData(original)
    const descifrado = await decryptData(cifrado)
    expect(descifrado).toBe(original)
  })

  it("dos cifrados del mismo valor producen ciphertexts distintos (IV aleatorio)", async () => {
    const { encryptData } = await import("@/lib/crypto")
    const c1 = await encryptData(100)
    const c2 = await encryptData(100)
    expect(c1).not.toBe(c2)
  })

  it("devuelve DECRYPT_ERROR o el input con datos corruptos (no lanza excepción)", async () => {
    const { decryptData, DECRYPT_ERROR } = await import("@/lib/crypto")
    const resultado = await decryptData("esto_no_es_un_ciphertext_valido")
    // decryptData nunca lanza: devuelve DECRYPT_ERROR si el formato es base64 válido
    // pero el contenido no descifra, o devuelve el input si no tiene el formato esperado
    expect(
      resultado === DECRYPT_ERROR || resultado === "esto_no_es_un_ciphertext_valido"
    ).toBe(true)
  })
})