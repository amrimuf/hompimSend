import { RequestHandler } from 'express';
import { createSession } from '../instance';
import prisma from '../utils/db';

export const create: RequestHandler = async (req, res) => {
    try {
        const { sessionId, deviceId } = req.body;

        const existingDevice = await prisma.device.findUnique({
            where: { pkId: deviceId },
        });

        const existingSession = await prisma.session.findFirst({
            where: { sessionId },
        });

        if (!existingDevice) {
            return res.status(404).json({ message: 'Device not found' });
        }

        if (existingSession) {
            return res.status(404).json({ message: 'Session already exist' });
        }

        createSession({ sessionId, deviceId, res });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};