import "server-only";
import crypto from "crypto";

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";

let warned = false;

const getKey = () => {
  const raw = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (!warned) {
      console.warn("[encryption] DATA_ENCRYPTION_KEY is missing. Data will be stored unencrypted.");
      warned = true;
    }
    return null;
  }

  const isHex = /^[0-9a-f]{64}$/i.test(raw);
  const key = Buffer.from(raw, isHex ? "hex" : "base64");

  if (key.length !== 32) {
    throw new Error(
      "[encryption] DATA_ENCRYPTION_KEY must be 32 bytes (base64 or hex).",
    );
  }

  return key;
};

export const isEncrypted = (value: string) => value.startsWith(PREFIX);

export const encryptText = (value: string) => {
  const key = getKey();
  if (!key) {
    return value;
  }

  if (!value) {
    return value;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
};

export const decryptText = (value: string) => {
  if (!value || !isEncrypted(value)) {
    return value;
  }

  const key = getKey();
  if (!key) {
    return value;
  }

  try {
    const parts = value.slice(PREFIX.length).split(":");
    if (parts.length !== 3) {
      return value;
    }
    const [ivRaw, encryptedRaw, tagRaw] = parts;
    const iv = Buffer.from(ivRaw, "base64");
    const encrypted = Buffer.from(encryptedRaw, "base64");
    const tag = Buffer.from(tagRaw, "base64");

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.warn("[encryption] Failed to decrypt value.", error);
    return value;
  }
};

export const encryptOptional = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  return encryptText(value);
};

export const decryptOptional = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  return decryptText(value);
};

export const encryptRecordFields = <T extends Record<string, unknown>>(
  record: T,
  fields: Array<keyof T>,
) => {
  const next = { ...record };
  fields.forEach((field) => {
    const value = next[field];
    if (typeof value === "string") {
      next[field] = encryptText(value) as T[typeof field];
    }
  });
  return next;
};

export const decryptRecordFields = <T extends Record<string, unknown>>(
  record: T,
  fields: Array<keyof T>,
) => {
  const next = { ...record };
  fields.forEach((field) => {
    const value = next[field];
    if (typeof value === "string") {
      next[field] = decryptText(value) as T[typeof field];
    }
  });
  return next;
};
