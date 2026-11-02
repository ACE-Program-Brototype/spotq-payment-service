import { platformFinanceController } from '@di/controller.resolution.ts';
import { adminAuthMiddleware } from '@presentation/middleware/admin-auth.middleware';
import { PLATFORM_FINANCE_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';

export const platformFinanceRouter = Router();

platformFinanceRouter.get(
	PLATFORM_FINANCE_ROUTES.SUMMARY,
	adminAuthMiddleware,
	platformFinanceController.getSummary,
);
