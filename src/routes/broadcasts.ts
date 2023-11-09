import express from 'express';
import * as controller from '../controllers/broadcast';
import { checkPrivilege } from '../middleware/auth';

const router = express.Router();

router.use(checkPrivilege('broadcast'));
router.post('/', controller.createBroadcast);
router.get('/', controller.getAllBroadcasts);
router.get('/:broadcastId', controller.getBroadcast);
router.get('/:broadcastId/outgoing', controller.getOutgoingBroadcasts);
router.get('/:broadcastId/replies', controller.getBrodcastReplies);

export default router;
