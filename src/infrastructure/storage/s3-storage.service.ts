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
import {
	CONTENT_DISPOSITION,
	HTTP_STATUS,
	INVOICE_PDF_CONTENT_TYPE,
	MESSAGES,
	S3_ERROR_NAMES,
	UNSAFE_CONTENT_DISPOSITION_FILENAME_REGEX,
} from '@shared/constants/index.ts';
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
		logger.debug({ bucket: this.bucket, key, contentType }, MESSAGES.S3_UPLOADING_FILE);

		try {
			await this.s3Client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: key,
					Body: buffer,
					ContentType: contentType,
				}),
			);
			logger.info({ bucket: this.bucket, key }, MESSAGES.S3_UPLOAD_SUCCESS);
		} catch (error) {
			logger.error({ err: error, bucket: this.bucket, key }, MESSAGES.S3_UPLOAD_FAILED);
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
			if (
				err?.name === S3_ERROR_NAMES.NOT_FOUND ||
				err?.$metadata?.httpStatusCode === HTTP_STATUS.NOT_FOUND
			) {
				return false;
			}
			throw error;
		}
	}

	async generatePresignedDownloadUrl(
		params: GeneratePresignedDownloadUrlInput,
	): Promise<GeneratePresignedDownloadUrlResult> {
		const expiresInSeconds = params.expiresInSeconds ?? this.defaultExpiresInSeconds;

		const trimmedFileName = params.fileName?.trim();
		const safeFileName = trimmedFileName
			? trimmedFileName.replace(
					UNSAFE_CONTENT_DISPOSITION_FILENAME_REGEX,
					CONTENT_DISPOSITION.FILENAME_REPLACEMENT,
				)
			: undefined;

		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: params.key,
			...(safeFileName
				? {
						ResponseContentType: INVOICE_PDF_CONTENT_TYPE,
						ResponseContentDisposition: `${CONTENT_DISPOSITION.ATTACHMENT}; ${CONTENT_DISPOSITION.FILENAME_PARAM}="${safeFileName}"`,
					}
				: {}),
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
