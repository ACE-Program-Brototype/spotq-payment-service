export interface GeneratePresignedDownloadUrlInput {
	key: string;
	expiresInSeconds?: number;
	fileName?: string;
}

export interface GeneratePresignedDownloadUrlResult {
	downloadUrl: string;
	expiresInSeconds: number;
}

export interface IStorageService {
	uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void>;
	fileExists(key: string): Promise<boolean>;
	generatePresignedDownloadUrl(
		params: GeneratePresignedDownloadUrlInput,
	): Promise<GeneratePresignedDownloadUrlResult>;
}
