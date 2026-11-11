import type { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3StorageService } from '@infrastructure/storage/s3-storage.service.ts';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: jest.fn(),
}));

describe('S3StorageService', () => {
	let service: S3StorageService;
	let mockS3Client: jest.Mocked<S3Client>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockS3Client = {} as unknown as jest.Mocked<S3Client>;
		service = new S3StorageService();
		service.setClientForTesting(mockS3Client);
	});

	it('should generate presigned download URL with specified expiration', async () => {
		(getSignedUrl as jest.Mock).mockResolvedValueOnce(
			'https://spotq-invoices.s3.ap-south-1.amazonaws.com/test.pdf?signed=true',
		);

		const result = await service.generatePresignedDownloadUrl({
			key: 'invoices/INV-001.pdf',
			expiresInSeconds: 900,
		});

		expect(result).toEqual({
			downloadUrl: 'https://spotq-invoices.s3.ap-south-1.amazonaws.com/test.pdf?signed=true',
			expiresInSeconds: 900,
		});
		expect(getSignedUrl).toHaveBeenCalledWith(
			mockS3Client,
			expect.objectContaining({
				input: expect.objectContaining({
					Key: 'invoices/INV-001.pdf',
				}),
			}),
			{ expiresIn: 900 },
		);
	});

	it('should use default expiration when expiresInSeconds is omitted', async () => {
		(getSignedUrl as jest.Mock).mockResolvedValueOnce('https://signed-url.com');

		const result = await service.generatePresignedDownloadUrl({
			key: 'invoices/INV-002.pdf',
		});

		expect(result.expiresInSeconds).toBe(900);
		expect(result.downloadUrl).toBe('https://signed-url.com');
	});
});
