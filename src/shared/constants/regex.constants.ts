export const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const HYPHEN_REGEX = /-/g;
export const CSV_QUOTE_REGEX = /"/g;
export const CSV_FILENAME_TIMESTAMP_REGEX = /[:.]/g;
export const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
export const UTF8_BOM_BYTE_LENGTH = UTF8_BOM.length;
