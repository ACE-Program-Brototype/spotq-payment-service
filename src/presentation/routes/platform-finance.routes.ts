import { platformFinanceController } from '@di/controller.resolution.ts';
import { adminAuthMiddleware } from '@presentation/middleware/admin-auth.middleware';
import { validateRequestQuery } from '@presentation/middleware/validation.middleware';
import { PLATFORM_FINANCE_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import { getPlatformMasterLedgerQuerySchema } from '../validators/platform-finance/get-platform-master-ledger.validtor.ts';

export const platformFinanceRouter = Router();

platformFinanceRouter.use(adminAuthMiddleware);

platformFinanceRouter.get(PLATFORM_FINANCE_ROUTES.SUMMARY, platformFinanceController.getSummary);

platformFinanceRouter.get(
	PLATFORM_FINANCE_ROUTES.LEDGER,
	validateRequestQuery(getPlatformMasterLedgerQuerySchema),
	platformFinanceController.getLedger,
);

platformFinanceRouter.get(
	PLATFORM_FINANCE_ROUTES.LEDGER_CSV,
	validateRequestQuery(getPlatformMasterLedgerQuerySchema),
	platformFinanceController.exportLedgerCsv,
);
