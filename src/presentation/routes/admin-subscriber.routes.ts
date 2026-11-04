import { adminSubscriberController } from '@di/controller.resolution.ts';
import { adminAuthMiddleware } from '@presentation/middleware/admin-auth.middleware.ts';
import { Router } from 'express';

export const adminSubscriberRouter = Router();

adminSubscriberRouter.use(adminAuthMiddleware);

adminSubscriberRouter.get('/', adminSubscriberController.listSubscribers);
adminSubscriberRouter.get('/:subscriberId', adminSubscriberController.getSubscriberDetails);
