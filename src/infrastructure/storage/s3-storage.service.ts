import type {
	GeneratePresignedDownloadUrlInput,
	GeneratePresignedDownloadUrlResult,
	IStorageService,
} from '@application/ports/services/storage.service.port.ts';
import {
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { injectable } from 'inversify';
import { s3Client as defaultS3Client } from './s3.client.ts';

@injectable()
export class S3StorageService implements IStorageService {
	private s3Client: S3Client;
	private readonly bucket: string;
	private readonly defaultExpiresInSeconds: number;

	constructor(client: S3Client = defaultS3Client) {
		this.bucket = config.s3.bucket;
		this.defaultExpiresInSeconds = config.s3.presignedUrlExpirationSeconds;
		this.s3Client = client;
	}

	setClientForTesting(client: S3Client): void {
		this.s3Client = client;
	}

	async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void> {
		logger.debug({ bucket: this.bucket, key, contentType }, 'Uploading file to S3');

		try {
			await this.s3Client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: key,
					Body: buffer,
					ContentType: contentType,
				}),
			);
			logger.info({ bucket: this.bucket, key }, 'Successfully uploaded file to S3');
		} catch (error) {
			logger.error({ err: error, bucket: this.bucket, key }, 'Failed to upload file to S3');
			throw error;
		}
	}

	async fileExists(key: string): Promise<boolean> {
		try {
			await this.s3Client.send(
				new HeadObjectCommand({
					Bucket: this.bucket,
					Key: key,
				}),
			);
			return true;
		} catch (error: unknown) {
			const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
			if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) {
				return false;
			}
			throw error;
		}
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
			this.s3Client as unknown as Parameters<typeof getSignedUrl>[0],
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
