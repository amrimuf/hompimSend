import { RequestHandler } from 'express';
import prisma from '../utils/db';
import schedule from 'node-schedule';
import { getInstance, getJid } from '../instance';
import logger from '../config/logger';
import { delay as delayMs } from '../utils/delay';

export const createBroadcast: RequestHandler = async (req, res) => {
    try {
        const { name, deviceId, recipients, message, schedule, delay } = req.body;

        const device = await prisma.device.findUnique({
            where: { id: deviceId },
            include: { sessions: { select: { sessionId: true } } },
        });

        if (!device) {
            return res.status(401).json({ message: 'Device not found' });
        }
        if (!device.sessions[0]) {
            return res.status(400).json({ message: 'Session not found' });
        }

        await prisma.broadcast.create({
            data: {
                name,
                message,
                schedule,
                deviceId: device.pkId,
                delay,
                recipients: {
                    set: recipients,
                },
            },
        });
        res.status(201).json({ message: 'Broadcast created successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllBroadcasts: RequestHandler = async (req, res) => {
    try {
        const deviceId = req.query.deviceId as string;
        const userId = req.authenticatedUser.pkId;
        const privilegeId = req.privilege.pkId;

        const broadcasts = await prisma.broadcast.findMany({
            where: {
                device: {
                    userId: privilegeId !== Number(process.env.SUPER_ADMIN_ID) ? userId : undefined,
                    id: deviceId,
                },
            },
            include: { device: true },
        });

        res.status(200).json(broadcasts);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const processedRecipients: (string | number)[] = [];

schedule.scheduleJob('*', async () => {
    try {
        const pendingBroadcasts = await prisma.broadcast.findMany({
            where: {
                schedule: {
                    lte: new Date(),
                },
                isSent: false,
            },
            include: { device: { select: { sessions: { select: { sessionId: true } } } } },
        });

        for (const broadcast of pendingBroadcasts) {
            const session = getInstance(broadcast.device.sessions[0].sessionId)!;
            for (let i = 0; i < broadcast.recipients.length; i++) {
                const recipient = broadcast.recipients[i];
                const isLastRecipient = i === broadcast.recipients.length - 1;

                if (processedRecipients.includes(recipient)) {
                    logger.info(
                        { message: 'Broadcast recipient has already been processed', recipient },
                        'skip broadcast',
                    );
                    continue;
                }

                const jid = getJid(recipient);
                await session.sendMessage(jid, { text: broadcast.message });
                processedRecipients.push(recipient);
                logger.info(
                    { message: 'Broadcast has just been processed', recipient },
                    'broadcast sent',
                );

                await delayMs(isLastRecipient ? 0 : broadcast.delay);
            }
            await prisma.broadcast.update({
                where: { id: broadcast.id },
                data: {
                    isSent: true,
                    updatedAt: new Date(),
                },
            });
        }
        logger.debug('Broadcast job is running...');
    } catch (error) {
        logger.error(error, 'Error processing scheduled broadcast messages');
    }
});
