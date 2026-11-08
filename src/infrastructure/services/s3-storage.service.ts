import type {
	GeneratePresignedDownloadUrlInput,
	GeneratePresignedDownloadUrlResult,
	IStorageService,
} from '@application/ports/services/storage.service.port.ts';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@config/index.ts';
import { injectable } from 'inversify';

@injectable()
export class S3StorageService implements IStorageService {
	private client: S3Client;
	private readonly bucket: string;
	private readonly defaultExpiresInSeconds: number;

	constructor() {
		this.bucket = config.storage.bucket;
		this.defaultExpiresInSeconds = config.storage.presignedUrlExpirationSeconds;
		this.client = new S3Client({
			region: config.storage.region,
			credentials: {
				accessKeyId: config.storage.accessKeyId,
				secretAccessKey: config.storage.secretAccessKey,
			},
		});
	}

	setClientForTesting(client: S3Client): void {
		this.client = client;
	}

	async generatePresignedDownloadUrl(
		params: GeneratePresignedDownloadUrlInput,
	): Promise<GeneratePresignedDownloadUrlResult> {
		const expiresInSeconds = params.expiresInSeconds ?? this.defaultExpiresInSeconds;

		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: params.key,
		});

		const downloadUrl = await getSignedUrl(
			this.client as unknown as Parameters<typeof getSignedUrl>[0],
			command,
			{
				expiresIn: expiresInSeconds,
			},
		);

		return {
			downloadUrl,
			expiresInSeconds,
		};
	}
}
