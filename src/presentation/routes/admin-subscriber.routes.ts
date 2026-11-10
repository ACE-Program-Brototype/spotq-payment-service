import { adminSubscriberController } from '@di/controller.resolution.ts';
import { adminAuthMiddleware } from '@presentation/middleware/admin-auth.middleware.ts';
import {
	validateRequestParams,
	validateRequestQuery,
} from '@presentation/middleware/validation.middleware.ts';
import { getAdminSubscriberDetailsParamsSchema } from '@presentation/validators/admin-subscribers/get-admin-subscriber-details.validator.ts';
import { listAdminSubscribersQuerySchema } from '@presentation/validators/admin-subscribers/list-admin-subscribers.validator.ts';
import { Router } from 'express';

export const adminSubscriberRouter = Router();

adminSubscriberRouter.use(adminAuthMiddleware);

adminSubscriberRouter.get(
	'/',
	validateRequestQuery(listAdminSubscribersQuerySchema),
	adminSubscriberController.listSubscribers,
);
adminSubscriberRouter.get(
	'/:subscriberId',
	validateRequestParams(getAdminSubscriberDetailsParamsSchema),
	adminSubscriberController.getSubscriberDetails,
);
