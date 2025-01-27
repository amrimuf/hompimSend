import { RequestHandler } from 'express';
import {
    createInstance,
    deleteInstance,
    getInstance,
    getInstanceStatus,
    getJid,
    verifyInstance,
} from '../whatsapp';
import prisma from '../utils/db';
import { generateUuid } from '../utils/keyGenerator';
import logger from '../config/logger';
import { isUUID } from '../utils/uuidChecker';

// one device, one session
// one whatsapp number, multiple devices == one whatsapp number, multiple sessions
export const createSession: RequestHandler = async (req, res) => {
    try {
        const { deviceId } = req.body;
        const sessionId = generateUuid();

        const existingDevice = await prisma.device.findUnique({
            where: { id: deviceId },
        });

        if (!existingDevice) {
            return res.status(404).json({ message: 'Device not found' });
        }

        const existingSession = await prisma.session.findFirst({
            where: { deviceId: existingDevice.pkId, device: { status: 'open' } },
        });

        if (existingSession) {
            return res.status(404).json({ message: 'This device is already linked.' });
        }

        createInstance({ sessionId, deviceId: existingDevice.pkId, res });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createSSE: RequestHandler = async (req, res) => {
    const { deviceId } = req.body;
    const sessionId = generateUuid();

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const existingDevice = await prisma.device.findUnique({
        where: { id: deviceId },
    });

    if (!existingDevice) {
        return res.status(404).json({ message: 'Device not found' });
    }

    if (verifyInstance(sessionId)) {
        res.write(`data: ${JSON.stringify({ error: 'Session already exists' })}\n\n`);
        res.end();
        return;
    }
    createInstance({ sessionId, deviceId: existingDevice.pkId, res, SSE: true });
};

export const getSessionStatus: RequestHandler = async (req, res) => {
    try {
        const session = getInstance(req.params.sessionId)!;
        if (!isUUID(req.params.sessionId)) {
            return res.status(400).json({ message: 'Invalid sessionId' });
        }
        res.status(200).json({ status: getInstanceStatus(session), session });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getSessions: RequestHandler = async (req, res) => {
    try {
        const pkId = req.authenticatedUser.pkId;
        const privilegeId = req.privilege.pkId;

        const sessions = await prisma.session.findMany({
            where: {
                device: {
                    userId: privilegeId !== Number(process.env.SUPER_ADMIN_ID) ? pkId : undefined,
                },
                id: { contains: 'config' },
            },
            select: {
                sessionId: true,
                device: { select: { id: true, phone: true, status: true } },
            },
        });

        res.status(200).json(sessions);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getSessionsByDeviceApiKey: RequestHandler = async (req, res) => {
    try {
        const deviceApiKey = req.params.deviceApiKey;

        const existingDevice = await prisma.device.findUnique({
            where: {
                apiKey: deviceApiKey,
            },
        });

        if (!existingDevice) {
            return res.status(404).json({ message: 'Device not found' });
        }

        const sessions = await prisma.session.findMany({
            where: {
                deviceId: existingDevice.pkId,
                id: { contains: 'config' },
            },
            select: {
                sessionId: true,
                data: true,
            },
        });

        if (!sessions) {
            return res.status(404).json({ message: 'Session not found' });
        }

        res.status(200).json(sessions);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

//to do: get session logs

export const deleteSession: RequestHandler = async (req, res) => {
    await deleteInstance(req.params.sessionId);

    if (!isUUID(req.params.sessionId)) {
        return res.status(400).json({ message: 'Invalid sessionId' });
    }

    res.status(200).json({ message: 'Session deleted' });
};

export const getSessionProfile: RequestHandler = async (req, res) => {
    try {
        const deviceId = req.params.deviceId;

        if (!isUUID(req.params.deviceId)) {
            return res.status(400).json({ message: 'Invalid deviceId' });
        }

        const device = await prisma.device.findUnique({
            where: { id: deviceId },
            select: {
                name: true,
                phone: true,
                sessions: { where: { id: { contains: 'config' } }, select: { sessionId: true } },
            },
        });

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        const sessionId = device.sessions[0].sessionId;

        if (!sessionId) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const jid = getJid(device.phone!);
        const session = getInstance(sessionId)!;
        const businessProfile = await session.getBusinessProfile(jid);
        const status = await session.fetchStatus(jid);
        const user = await session.user;

        // await session.sendPresenceUpdate('available');
        // session.ev.on('presence.update', ({ presences }) => {
        //     logger.warn(presences);
        // });
        // session.presenceSubscribe(jid);

        res.status(200).json({
            device,
            profileName: user?.name,
            presence: 'available',
            status: status?.status,
            address: businessProfile?.address,
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateSessionProfile: RequestHandler = async (req, res) => {
    try {
        const deviceId = req.params.deviceId;

        if (!isUUID(req.params.deviceId)) {
            return res.status(400).json({ message: 'Invalid deviceId' });
        }
        const device = await prisma.device.findUnique({
            where: { id: deviceId },
            select: {
                sessions: { where: { id: { contains: 'config' } }, select: { sessionId: true } },
            },
        });

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        const sessionId = device.sessions[0].sessionId;

        if (!sessionId) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const session = getInstance(sessionId)!;
        const { profileName, presence, status } = req.body;

        session.updateProfileName(profileName);
        session.sendPresenceUpdate(presence);
        session.updateProfileStatus(status);

        res.status(200).json({ message: 'Session profile updated successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
