import { platformFinanceController } from '@di/controller.resolution.ts';
import { adminAuthMiddleware } from '@presentation/middleware/admin-auth.middleware';
import { validateRequestQuery } from '@presentation/middleware/validation.middleware';
import { PLATFORM_FINANCE_ROUTES } from '@shared/constants/routes.constants.ts';
import { Router } from 'express';
import { exportPlatformMasterLedgerQuerySchema } from '../validators/platform-finance/export-platform-master-ledger.validator.ts';
import { getPlatformMasterLedgerQuerySchema } from '../validators/platform-finance/get-platform-master-ledger.validator.ts';

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
	validateRequestQuery(exportPlatformMasterLedgerQuerySchema),
	platformFinanceController.exportLedgerCsv,
);
