export interface GeneratePresignedDownloadUrlInput {
	key: string;
	expiresInSeconds?: number;
}

export interface GeneratePresignedDownloadUrlResult {
	downloadUrl: string;
	expiresInSeconds: number;
}

export interface IStorageService {
	generatePresignedDownloadUrl(
		params: GeneratePresignedDownloadUrlInput,
	): Promise<GeneratePresignedDownloadUrlResult>;
}
