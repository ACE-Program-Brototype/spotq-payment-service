import 'reflect-metadata';
import {
	errorMiddleware,
	loggerMiddleware,
	metricsMiddleware,
	notFoundMiddleware,
} from '@presentation/middleware/index.ts';
import { router } from '@presentation/routes/index.routes.ts';
import { ROUTES } from '@shared/index.ts';
import express from 'express';

const app = express();

app.use(loggerMiddleware);
app.use(metricsMiddleware);
app.use(
	express.json({
		verify: (req: express.Request, _res: express.Response, buf: Buffer) => {
			(req as unknown as { rawBody: string }).rawBody = buf.toString('utf8');
		},
	}),
);

app.use(ROUTES.ROOT, router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
