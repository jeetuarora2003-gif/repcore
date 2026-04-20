/**
 * Isomorphic Encryption Utility using Web Crypto API.
 * Optimized for Next.js 14 on Vercel (Node.js 18).
 * Uses dynamic import for 'crypto' inside functions to hide Node utilities from the client-side bundler 
 * and prevent "Module Not Found" errors during build.
 */

const ENCRYPTION_KEY = (process.env.WHATSAPP_ENCRYPTION_KEY || "r3pc0r3_s3cr3t_v1_f0r_w_h_a_t_s_a_p_p_").slice(0, 32); 
const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // Standard for AES-GCM

/**
 * Helper to get the correct Web Crypto implementation regardless of environment.
 */
async function getSubtle() {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return crypto.subtle; // Edge Runtime or Node 19+
  }
  // Node.js 18 fallback
  const nodeCrypto = await import("crypto");
  return (nodeCrypto.webcrypto as any).subtle;
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
 * Encrypts a string before storing it in the database.
 * Returns a string in 'iv:encryptedData' format (hex).
 */
export async function encrypt(text: string): Promise<string> {
  if (!text) return "";
  
  const subtle = await getSubtle();
  const key = await getEncryptionKey(subtle);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  
  const encryptedBuffer = await subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(text)
  );

  // Convert to Hex for storage
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
  const encryptedHex = Array.from(new Uint8Array(encryptedBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return `${ivHex}:${encryptedHex}`;
}

/**
 * Decrypts a stored encrypted string.
 */
export async function decrypt(text: string): Promise<string> {
  if (!text) return "";
  
  try {
    const [ivHex, encryptedHex] = text.split(":");
    if (!ivHex || !encryptedHex) return "";

    const subtle = await getSubtle();
    const key = await getEncryptionKey(subtle);
    
    // Convert hex back to Uint8Array
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encryptedData = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const decryptedBuffer = await subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "";
  }
}
