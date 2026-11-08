import type { IStorageService } from '@application/ports/services/storage.service.port.ts';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '@config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { injectable } from 'inversify';

@injectable()
export class S3StorageService implements IStorageService {
	private readonly s3Client: S3Client;
	private readonly bucket: string;

	constructor() {
		this.bucket = config.s3.bucket;
		this.s3Client = new S3Client({
			region: config.s3.region,
			credentials: {
				accessKeyId: config.s3.accessKeyId,
				secretAccessKey: config.s3.secretAccessKey,
			},
			...(config.s3.endpoint
				? {
						endpoint: config.s3.endpoint,
						forcePathStyle: true,
					}
				: {}),
		});
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
}
