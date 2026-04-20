/**
 * Isomorphic Encryption Utility (Web Crypto API).
 * Optimized for Next.js 14 (Node.js 18, Edge Runtime, Browser).
 * 
 * 🛡️ ZERO Node.js globals (no Buffer).
 * 🛡️ ZERO top-level Node.js imports (no crypto module).
 * 🛡️ 100% Isomorphic.
 */

const ENCRYPTION_KEY = (process.env.WHATSAPP_ENCRYPTION_KEY || "r3pc0r3_s3cr3t_v1_f0r_w_h_a_t_s_a_p_p_").slice(0, 32); 
const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

/**
 * Pure JS Hex Helpers (Replacement for Node Buffer)
 */
function toHex(data: Uint8Array): string {
  return Array.from(data).map(b => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Reliable SubtleCrypto getter.
 */
async function getSubtle(): Promise<SubtleCrypto> {
  if (typeof globalThis.crypto?.subtle !== "undefined") {
    return globalThis.crypto.subtle;
  }
  // Fallback for Node.js 18 where it might not be global
  try {
    const nodeCrypto = eval('require("node:crypto")');
    return nodeCrypto.webcrypto.subtle;
  } catch (e) {
    throw new Error("Wait-Crypto (Subtle) not available in this environment.");
  }
}

async function getEncryptionKey(subtle: SubtleCrypto) {
  const encoder = new TextEncoder();
  return await subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY),
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * AES-GCM Encryption
 */
export async function encrypt(text: string): Promise<string> {
  if (!text) return "";
  
  const subtle = await getSubtle();
  const key = await getEncryptionKey(subtle);
  
  // Generate random IV
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  
  const encryptedBuffer = await subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(text)
  );

  return `${toHex(iv)}:${toHex(new Uint8Array(encryptedBuffer))}`;
}

/**
 * AES-GCM Decryption
 */
export async function decrypt(text: string): Promise<string> {
  if (!text) return "";
  
  try {
    const parts = text.split(":");
    if (parts.length !== 2) return ""; // Likely old format or corrupt

    const iv = fromHex(parts[0]);
    const data = fromHex(parts[1]);

    const subtle = await getSubtle();
    const key = await getEncryptionKey(subtle);

    const decryptedBuffer = await subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Isomorphic Decryption failed:", error);
    return "";
  }
}
