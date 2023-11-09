import { Router, Request, Response } from 'express';
import authRoutes from './auth';
import deviceRoutes from './devices';
import userRoutes from './users';
import sessionRoutes from './sessions';
import contactRoutes from './contacts';
import groupRoutes from './groups';
import messageRoutes from './messages';
import paymentRoutes from './payments';
import autoReplyRoutes from './autoReplies';
import broadcastRoutes from './broadcasts';
import campaignRoutes from './campaigns';
import menuRoutes from './menus';
import subsPlanRoutes from './subscriptionPlans';
import privilegeRoutes from './privileges';
import customerServiceRoutes from './customerServices';
import businessHourRoutes from './businessHours';
import authMiddleware from '../middleware/auth';

const router = Router();

router.get('/', (req: Request, res: Response) => {
    res.send('Forwardin Jaya Jaya Jaya!');
});

router.use('/auth', authRoutes);
router.use('/sessions', authMiddleware, sessionRoutes);
router.use('/devices', authMiddleware, deviceRoutes);
router.use('/users', authMiddleware, userRoutes);
router.use('/contacts', authMiddleware, contactRoutes);
router.use('/groups', authMiddleware, groupRoutes);
router.use('/messages', authMiddleware, messageRoutes);
router.use('/payment', paymentRoutes);
router.use('/business-hours', authMiddleware, businessHourRoutes);
router.use('/auto-replies', authMiddleware, autoReplyRoutes);
router.use('/broadcasts', authMiddleware, broadcastRoutes);
router.use('/campaigns', authMiddleware, campaignRoutes);
router.use('/menus', authMiddleware, menuRoutes);
router.use('/privileges', authMiddleware, privilegeRoutes);
router.use('/subscription-plans', authMiddleware, subsPlanRoutes);
router.use('/customer-services', customerServiceRoutes);

export default router;
