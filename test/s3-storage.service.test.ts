import type { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3StorageService } from '@infrastructure/storage/s3-storage.service.ts';
import { HTTP_STATUS, S3_ERROR_NAMES } from '@shared/constants/index.ts';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: jest.fn(),
}));

describe('S3StorageService', () => {
	let service: S3StorageService;
	let mockS3Client: jest.Mocked<S3Client>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockS3Client = {
			send: jest.fn(),
		} as unknown as jest.Mocked<S3Client>;
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

	it('should set sanitized ResponseContentDisposition and ResponseContentType when fileName is provided', async () => {
		(getSignedUrl as jest.Mock).mockResolvedValueOnce('https://signed-url.com/attachment');

		const result = await service.generatePresignedDownloadUrl({
			key: 'invoices/INV-003.pdf',
			fileName: 'SpotQ-Invoice-"../INV-003\n.pdf',
		});

		expect(result.downloadUrl).toBe('https://signed-url.com/attachment');
		expect(getSignedUrl).toHaveBeenCalledWith(
			mockS3Client,
			expect.objectContaining({
				input: expect.objectContaining({
					Key: 'invoices/INV-003.pdf',
					ResponseContentType: 'application/pdf',
					ResponseContentDisposition: 'attachment; filename="SpotQ-Invoice-_.._INV-003_.pdf"',
				}),
			}),
			{ expiresIn: 900 },
		);
	});

	it('should return true in fileExists when HeadObject succeeds', async () => {
		(mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

		await expect(service.fileExists('invoices/INV-001.pdf')).resolves.toBe(true);
	});

	it('should return false in fileExists when S3 returns NotFound error name', async () => {
		(mockS3Client.send as jest.Mock).mockRejectedValueOnce({ name: S3_ERROR_NAMES.NOT_FOUND });

		await expect(service.fileExists('invoices/missing.pdf')).resolves.toBe(false);
	});

	it('should return false in fileExists when S3 returns HTTP 404 status code', async () => {
		(mockS3Client.send as jest.Mock).mockRejectedValueOnce({
			$metadata: { httpStatusCode: HTTP_STATUS.NOT_FOUND },
		});

		await expect(service.fileExists('invoices/missing.pdf')).resolves.toBe(false);
	});

	it('should rethrow unexpected errors in fileExists', async () => {
		const error = new Error('AccessDenied');
		(mockS3Client.send as jest.Mock).mockRejectedValueOnce(error);

		await expect(service.fileExists('invoices/INV-001.pdf')).rejects.toThrow(error);
	});
});
