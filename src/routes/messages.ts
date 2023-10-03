import { Router } from 'express';
import * as controller from '../controllers/message';

const router = Router();

router.post('/:sessionId/send', controller.send);
router.post('/:sessionId/send/bulk', controller.sendBulk);
router.get('/:sessionId', controller.list);

export default router;