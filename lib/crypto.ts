/**
 * lib/crypto.ts
 *
 * Encriptación AES-256-GCM para datos PII de pacientes.
 * IMPORTANTE: Este módulo solo corre en el servidor (Node.js).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { cryptoLogger } from "@/lib/logger";

const ALGORITHM  = "aes-256-gcm" as const;
const KEY_LENGTH = 32;
const IV_LENGTH  = 12;
const TAG_LENGTH = 16;
const ENCODING   = "base64" as const;

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;

  if (!raw || raw.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY env var must be a 64-character hex string (32 bytes). " +
      "Generate with: openssl rand -hex 32"
    );
  }

  return Buffer.from(raw, "hex");
}

function deriveKey(purpose: string): Buffer {
  const masterKey = getEncryptionKey();
  return scryptSync(masterKey, Buffer.from(purpose, "utf8"), KEY_LENGTH, {
    N: 2 ** 14,
    r: 8,
    p: 1,
  });
}

export interface EncryptedData {
  iv:         string;
  tag:        string;
  ciphertext: string;
  version:    number;
}

export function encrypt(plaintext: string, purpose: string): EncryptedData {
  const key = deriveKey(purpose);
  const iv  = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    iv:         iv.toString(ENCODING),
    tag:        tag.toString(ENCODING),
    ciphertext: ciphertext.toString(ENCODING),
    version:    1,
  };
}

export function decrypt(data: EncryptedData, purpose: string): string {
  if (data.version !== 1) {
    throw new Error(`Unsupported encryption version: ${data.version}`);
  }

  const key        = deriveKey(purpose);
  const iv         = Buffer.from(data.iv, ENCODING);
  const tag        = Buffer.from(data.tag, ENCODING);
  const ciphertext = Buffer.from(data.ciphertext, ENCODING);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  decipher.setAuthTag(tag);

  try {
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    cryptoLogger.error({ purpose }, "Decryption failed — auth tag mismatch or corrupted data");
    throw new Error("Decryption failed: data may have been tampered with");
  }
}

export function encryptedDataToString(data: EncryptedData): string {
  return Buffer.from(JSON.stringify(data), "utf8").toString(ENCODING);
}

export function stringToEncryptedData(raw: string): EncryptedData {
  return JSON.parse(Buffer.from(raw, ENCODING).toString("utf8")) as EncryptedData;
}

export interface PatientPIIPlain {
  firstName:      string;
  lastName:       string;
  dateOfBirth:    string;
  email?:         string;
  phone?:         string;
  emergencyName?: string;
  emergencyPhone?: string;
  therapistNotes?: string;
}

export interface PatientPIIEncrypted {
  firstName:      string;
  lastName:       string;
  dateOfBirth:    string;
  email?:         string;
  phone?:         string;
  emergencyName?: string;
  emergencyPhone?: string;
  therapistNotes?: string;
}

const PII_PURPOSE = "patient.pii" as const;

export function encryptPatientPII(pii: PatientPIIPlain): PatientPIIEncrypted {
  const encryptField = (value: string, field: string): string =>
    encryptedDataToString(encrypt(value, `${PII_PURPOSE}.${field}`));

  const result: PatientPIIEncrypted = {
    firstName:   encryptField(pii.firstName,   "firstName"),
    lastName:    encryptField(pii.lastName,    "lastName"),
    dateOfBirth: encryptField(pii.dateOfBirth, "dateOfBirth"),
  };

  if (pii.email !== undefined)         result.email         = encryptField(pii.email,         "email");
  if (pii.phone !== undefined)         result.phone         = encryptField(pii.phone,         "phone");
  if (pii.emergencyName !== undefined) result.emergencyName = encryptField(pii.emergencyName, "emergencyName");
  if (pii.emergencyPhone !== undefined)result.emergencyPhone= encryptField(pii.emergencyPhone,"emergencyPhone");
  if (pii.therapistNotes !== undefined)result.therapistNotes= encryptField(pii.therapistNotes,"therapistNotes");

  return result;
}

export function decryptPatientPII(encrypted: PatientPIIEncrypted): PatientPIIPlain {
  const decryptField = (value: string, field: string): string =>
    decrypt(stringToEncryptedData(value), `${PII_PURPOSE}.${field}`);

  const result: PatientPIIPlain = {
    firstName:   decryptField(encrypted.firstName,   "firstName"),
    lastName:    decryptField(encrypted.lastName,    "lastName"),
    dateOfBirth: decryptField(encrypted.dateOfBirth, "dateOfBirth"),
  };

  if (encrypted.email !== undefined)         result.email         = decryptField(encrypted.email,         "email");
  if (encrypted.phone !== undefined)         result.phone         = decryptField(encrypted.phone,         "phone");
  if (encrypted.emergencyName !== undefined) result.emergencyName = decryptField(encrypted.emergencyName, "emergencyName");
  if (encrypted.emergencyPhone !== undefined)result.emergencyPhone= decryptField(encrypted.emergencyPhone,"emergencyPhone");
  if (encrypted.therapistNotes !== undefined)result.therapistNotes= decryptField(encrypted.therapistNotes,"therapistNotes");

  return result;
}

const NAME_PLACEHOLDER     = "[NOMBRE]";
const DATE_PLACEHOLDER     = "[FECHA]";
const LOCATION_PLACEHOLDER = "[LUGAR]";

export function anonymizeTranscription(
  text: string,
  options: {
    anonymizeNames?:     boolean;
    anonymizeDates?:     boolean;
    anonymizeLocations?: boolean;
  } = {}
): { anonymized: string; replacements: number } {
  let anonymized = text;
  let replacements = 0;

  if (options.anonymizeNames ?? true) {
    const namePattern = /\b[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]{2,})+\b/g;
    const matches = anonymized.match(namePattern) ?? [];
    replacements += matches.length;
    anonymized = anonymized.replace(namePattern, NAME_PLACEHOLDER);
  }

  if (options.anonymizeDates ?? false) {
    const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{1,2}\s+de\s+[a-záéíóúüñ]+(?:\s+de\s+\d{4})?\b/gi;
    const matches = anonymized.match(datePattern) ?? [];
    replacements += matches.length;
    anonymized = anonymized.replace(datePattern, DATE_PLACEHOLDER);
  }

  if (options.anonymizeLocations ?? false) {
    const locationPattern = /\b(calle|avenida|plaza|barrio|municipio|ciudad)\s+[A-ZÁÉÍÓÚÜÑ][^\.,;]{2,30}/gi;
    const matches = anonymized.match(locationPattern) ?? [];
    replacements += matches.length;
    anonymized = anonymized.replace(locationPattern, LOCATION_PLACEHOLDER);
  }

  return { anonymized, replacements };
}
