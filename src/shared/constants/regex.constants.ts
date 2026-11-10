export const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const HYPHEN_REGEX = /-/g;
export const CSV_QUOTE_REGEX = /"/g;
export const CSV_FILENAME_TIMESTAMP_REGEX = /[:.]/g;
export const BANK_ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
export const IFSC_CODE_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_.:-]{8,128}$/;
export const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
export const UTF8_BOM_BYTE_LENGTH = UTF8_BOM.length;
