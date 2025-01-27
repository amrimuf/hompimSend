import { Router } from 'express';
import * as controller from '../controllers/payment';
import authMiddleware, { checkPrivilege } from '../middleware/auth';

const router = Router();

router.post('/notification', controller.handleNotification);

router.use(authMiddleware);
router.use(checkPrivilege('payment'));
router.post('/pay', controller.pay);
router.post('/trial', controller.subscribeToTrial);
router.get('/subscriptions', controller.getSubscriptions);
router.get('/subscription/:subscriptionId', controller.getSubscription);
router.get('/transactions', controller.getTransactions);
router.get('/transactions/:transactionId/status', controller.getTransactionStatus);

export default router;
