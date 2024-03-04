/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler } from 'express';
import prisma from '../utils/db';
import { getInstance, getJid, sendMediaFile } from '../whatsapp';
import logger from '../config/logger';
import { replaceVariables } from '../utils/variableHelper';
import { generateSlug } from '../utils/slug';
import { diskUpload } from '../config/multer';
import { useAutoReply } from '../utils/quota';
import { isUUID } from '../utils/uuidChecker';

export const createAutoReplies: RequestHandler = async (req, res) => {
    const subscription = req.subscription;

    try {
        diskUpload.single('media')(req, res, async (err: any) => {
            if (err) {
                return res.status(400).json({ message: 'Error uploading file' });
            }
            const { name, deviceId, recipients, requests, response } = req.body;

            if (
                recipients.includes('all') &&
                recipients.some((recipient: { startsWith: (arg0: string) => string }) =>
                    recipient.startsWith('label'),
                )
            ) {
                return res.status(400).json({
                    message:
                        "Recipients can't contain both all contacts and contact labels at the same input",
                });
            }

            const device = await prisma.device.findUnique({
                where: { id: deviceId },
            });

            if (!device) {
                return res.status(404).json({ message: 'Device not found' });
            }

            const existingRequest = await prisma.autoReply.findFirst({
                where: { requests: { hasSome: requests }, deviceId: device.pkId },
            });

            if (existingRequest) {
                return res.status(400).json({ message: 'Request keywords already defined' });
            }

            await prisma.$transaction(async (transaction) => {
                const autoReply = await transaction.autoReply.create({
                    data: {
                        name,
                        requests: {
                            set: requests,
                        },
                        response,
                        deviceId: device.pkId,
                        recipients: {
                            set: recipients,
                        },
                        mediaPath: req.file?.path,
                    },
                });
                await useAutoReply(transaction, subscription);
                res.status(201).json(autoReply);
            });
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAutoReplies: RequestHandler = async (req, res) => {
    try {
        const deviceId = (req.query.deviceId as string) || undefined;
        const userId = req.authenticatedUser.pkId;
        const privilegeId = req.privilege.pkId;

        const autoRepliesRaw = await prisma.autoReply.findMany({
            where: {
                device: {
                    userId: privilegeId !== Number(process.env.ADMIN_ID) ? undefined : userId,
                    user: {
                        customerServices: {
                            some: {
                                pkId:
                                    privilegeId !== Number(process.env.CS_ID) ? undefined : userId,
                            },
                        },
                    },
                    id: deviceId,
                },
            },

            select: {
                id: true,
                name: true,
                status: true,
                recipients: true,
                device: { select: { name: true, contactDevices: { select: { contact: true } } } },
                createdAt: true,
                updatedAt: true,
            },
        });

        const autoReplies = [];
        for (const autoReply of autoRepliesRaw) {
            let numberOfRecipients = 0;
            for (const recipient of autoReply.recipients) {
                if (recipient.includes('all')) {
                    numberOfRecipients += autoReply.device.contactDevices.length;
                } else if (recipient.includes('label')) {
                    const contactLabel = recipient.split('_')[1];
                    const contactsCount = await prisma.contact.count({
                        where: {
                            ContactLabel: { some: { label: { slug: generateSlug(contactLabel) } } },
                        },
                    });
                    numberOfRecipients += contactsCount;
                } else if (recipient.includes('*')) {
                    numberOfRecipients = 999;
                } else {
                    numberOfRecipients += 1;
                }
            }
            const autoRepliesCount = {
                ...autoReply,
                recipientsCount: numberOfRecipients,
            };

            autoReplies.push(autoRepliesCount);
        }

        res.json(autoReplies);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAutoReply: RequestHandler = async (req, res) => {
    try {
        const id = req.params.id;

        if (!isUUID(id)) {
            return res.status(400).json({ message: 'Invalid autoReplyId' });
        }

        const autoReply = await prisma.autoReply.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                recipients: true,
                requests: true,
                mediaPath: true,
                response: true,
            },
        });

        if (!autoReply) {
            return res.status(404).json({ error: 'Auto reply not found' });
        }

        res.status(200).json(autoReply);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAutoReplyRecipients: RequestHandler = async (req, res) => {
    try {
        const id = req.params.id;

        if (!isUUID(id)) {
            return res.status(400).json({ message: 'Invalid autoReplyId' });
        }
        const autoReply = await prisma.autoReply.findUnique({
            where: { id },
        });

        if (!autoReply) {
            return res.status(404).json({ error: 'Auto reply not found' });
        }

        const recipients = await prisma.contact.findMany({
            where: {
                phone: { in: autoReply.recipients },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            select: {
                firstName: true,
                lastName: true,
                phone: true,
                ContactLabel: { select: { label: { select: { name: true } } } },
            },
        });

        const recipientContactMap: { [key: string]: unknown } = {};

        for (const recipient of autoReply.recipients) {
            const contact = recipients.find((c) => c.phone === recipient);
            recipientContactMap[recipient] = contact || null;
        }

        res.json(recipientContactMap);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateAutoReply: RequestHandler = async (req, res) => {
    try {
        const id = req.params.id;

        if (!isUUID(id)) {
            return res.status(400).json({ message: 'Invalid autoReplyId' });
        }

        diskUpload.single('media')(req, res, async (err: any) => {
            if (err) {
                return res.status(400).json({ message: 'Error uploading file' });
            }
            const { name, deviceId, recipients, requests, response, status } = req.body;

            if (
                recipients.includes('all') &&
                recipients.some((recipient: { startsWith: (arg0: string) => string }) =>
                    recipient.startsWith('label'),
                )
            ) {
                return res.status(400).json({
                    message:
                        "Recipients can't contain both all contacts and contact labels at the same input",
                });
            }

            const device = await prisma.device.findUnique({
                where: { id: deviceId },
            });

            if (!device) {
                return res.status(404).json({ message: 'Device not found' });
            }

            const updatedAutoReply = await prisma.autoReply.update({
                where: { id },
                data: {
                    name,
                    requests: {
                        set: requests,
                    },
                    response,
                    status,
                    deviceId: device.pkId,
                    recipients: {
                        set: recipients,
                    },
                    mediaPath: req.file?.path,
                    updatedAt: new Date(),
                },
            });

            res.status(200).json(updatedAutoReply);
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateAutoReplyStatus: RequestHandler = async (req, res) => {
    try {
        const id = req.params.id;
        const status = req.body.status;

        if (!isUUID(id)) {
            return res.status(400).json({ message: 'Invalid autoReplyId' });
        }
        const updatedAutoReply = await prisma.autoReply.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date(),
            },
        });

        res.status(200).json(updatedAutoReply);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteAutoReplies: RequestHandler = async (req, res) => {
    const autoReplyIds = req.body.autoReplyIds;

    try {
        const groupPromises = autoReplyIds.map(async (autoReplyId: string) => {
            await prisma.autoReply.delete({
                where: { id: autoReplyId },
            });
        });

        // wait for all the Promises to settle (either resolve or reject)
        await Promise.all(groupPromises);

        res.status(200).json({ message: 'Auto-rep(s) deleted successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendAutoReply(sessionId: any, data: any) {
    try {
        const session = getInstance(sessionId)!;
        const recipient = data.key.remoteJid;
        const jid = getJid(recipient);
        const phoneNumber = recipient.split('@')[0];
        const name = data.pushName;
        const messageText =
            data.message?.conversation ||
            data.message?.extendedTextMessage?.text ||
            data.message?.imageMessage?.caption ||
            '';

        // !!!back here: handle send AR to group, label
        const matchingAutoReply = await prisma.autoReply.findFirst({
            where: {
                AND: [
                    {
                        requests: {
                            has: messageText,
                        },
                        status: true,
                        device: { sessions: { some: { sessionId } } },
                    },
                    {
                        OR: [
                            {
                                recipients: { has: phoneNumber },
                            },
                            { recipients: { has: '*' } },
                            {
                                recipients: { has: 'all' },
                                device: {
                                    contactDevices: { some: { contact: { phone: phoneNumber } } },
                                },
                            },
                            {
                                recipients: { has: 'all' },
                                device: {
                                    contactDevices: { some: { contact: { phone: phoneNumber } } },
                                },
                            },
                        ],
                    },
                ],
            },
            include: { device: { select: { contactDevices: { select: { contact: true } } } } },
        });

        if (matchingAutoReply) {
            const replyText = matchingAutoReply.response;

            const variables = {
                firstName:
                    matchingAutoReply.device.contactDevices.filter(
                        (cd) => cd.contact.phone == phoneNumber,
                    )[0]?.contact.firstName ?? name,
                lastName:
                    matchingAutoReply.device.contactDevices.filter(
                        (cd) => cd.contact.phone == phoneNumber,
                    )[0]?.contact.lastName ?? undefined,
                phoneNumber:
                    matchingAutoReply.device.contactDevices.filter(
                        (cd) => cd.contact.phone == phoneNumber,
                    )[0]?.contact.phone ?? undefined,
                email:
                    matchingAutoReply.device.contactDevices.filter(
                        (cd) => cd.contact.phone == phoneNumber,
                    )[0]?.contact.email ?? undefined,
            };

            session.readMessages([data.key]);
            if (matchingAutoReply.mediaPath) {
                await sendMediaFile(
                    session,
                    [jid],
                    {
                        url: matchingAutoReply.mediaPath,
                        newName: matchingAutoReply.mediaPath.split('/').pop(),
                    },
                    ['jpg', 'png', 'jpeg'].includes(
                        matchingAutoReply.mediaPath.split('.').pop() || '',
                    )
                        ? 'image'
                        : 'document',
                    replaceVariables(replyText, variables),
                    data,
                );
            } else {
                session.sendMessage(
                    jid,
                    { text: replaceVariables(replyText, variables) },
                    { quoted: data },
                );
            }
            logger.warn(matchingAutoReply, 'auto reply response sent successfully');
        }
    } catch (error) {
        logger.error(error);
    }
}
