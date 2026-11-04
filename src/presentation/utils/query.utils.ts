export const emptyToUndefined = (val: unknown) =>
	typeof val === 'string' && val.trim() === '' ? undefined : val;
