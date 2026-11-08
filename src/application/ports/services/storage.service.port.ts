export interface IStorageService {
	uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void>;
	fileExists(key: string): Promise<boolean>;
}
