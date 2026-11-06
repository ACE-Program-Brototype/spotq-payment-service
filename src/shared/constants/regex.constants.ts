export const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const HYPHEN_REGEX = /-/g;
export const CSV_QUOTE_REGEX = /"/g;
export const CSV_FILENAME_TIMESTAMP_REGEX = /[:.]/g;
export const BANK_ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
export const IFSC_CODE_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
export const UTF8_BOM_BYTE_LENGTH = UTF8_BOM.length;
