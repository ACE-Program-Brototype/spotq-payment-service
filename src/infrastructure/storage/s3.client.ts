import { S3Client } from '@aws-sdk/client-s3';
import { config } from '@config/index.ts';

export const s3Client = new S3Client({
	region: config.s3.region,
	credentials: {
		accessKeyId: config.s3.accessKeyId,
		secretAccessKey: config.s3.secretAccessKey,
	},
});
