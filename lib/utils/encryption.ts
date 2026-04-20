import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Fallback is for local development only. Production MUST set WHATSAPP_ENCRYPTION_KEY.
const ENCRYPTION_KEY = (process.env.WHATSAPP_ENCRYPTION_KEY || "r3pc0r3_s3cr3t_v1_f0r_w_h_a_t_s_a_p_p_").slice(0, 32); 
const IV_LENGTH = 16;

/**
 * Encrypts a string (like a WhatsApp API Key) before storing it in the database.
 * Returns a string in 'iv:encryptedData' format.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Decrypts a stored API Key string.
 */
export function decrypt(text: string): string {
  if (!text) return "";
  try {
    const textParts = text.split(":");
    const ivPart = textParts.shift();
    if (!ivPart) return "";
    
    const iv = Buffer.from(ivPart, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption failed:", error);
    return "";
  }
}
