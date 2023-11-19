/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler } from 'express';
import prisma from '../utils/db';
import { getRandomColor } from '../utils/profilePic';
import { generateSlug } from '../utils/slug';
import logger from '../config/logger';
import { useContact } from '../utils/quota';
import { memoryUpload } from '../config/multer';
import ExcelJS from 'exceljs';

export const createContact: RequestHandler = async (req, res) => {
    try {
        const { firstName, lastName, phone, email, gender, dob, labels, deviceId } = req.body;

        const pkId = req.authenticatedUser.pkId;
        const privilegeId = req.privilege.pkId;
        const subscription = req.subscription;

        const existingContact = await prisma.contact.findFirst({
            where: {
                phone,
                AND: {
                    contactDevices: {
                        some: {
                            device: {
                                id: deviceId,
                                userId:
                                    privilegeId !== Number(process.env.SUPER_ADMIN_ID)
                                        ? pkId
                                        : undefined,
                            },
                        },
                    },
                },
            },
        });

        // contacts are saved per user (not per device)
        if (existingContact) {
            return res.status(400).json({
                message: 'Contact with this email or phone number already exists in your contact',
            });
        }

        await prisma.$transaction(async (transaction) => {
            const createdContact = await transaction.contact.create({
                data: {
                    firstName,
                    lastName,
                    phone,
                    email,
                    gender,
                    dob: dob ? new Date(dob) : null,
                    colorCode: getRandomColor(),
                },
            });

            const existingDevice = await transaction.device.findUnique({
                where: {
                    id: deviceId,
                },
                include: { sessions: { select: { sessionId: true } } },
            });

            if (!existingDevice) {
                throw new Error('Device not found');
            }
            if (!existingDevice.sessions[0]) {
                return res.status(400).json({ message: 'Session not found' });
            }

            labels.push(`device_${existingDevice.name}`);
            if (labels && labels.length > 0) {
                const labelIds: number[] = [];

                for (const labelName of labels) {
                    const slug = generateSlug(labelName);
                    const createdLabel = await transaction.label.upsert({
                        where: {
                            slug,
                        },
                        create: {
                            name: labelName,
                            slug,
                        },
                        update: {
                            name: labelName,
                            slug,
                        },
                    });

                    labelIds.push(createdLabel.pkId);
                }

                await transaction.contactLabel.createMany({
                    data: labelIds.map((labelId) => ({
                        contactId: createdContact.pkId,
                        labelId: labelId,
                    })),
                    skipDuplicates: true,
                });
            }

            await transaction.outgoingMessage.updateMany({
                where: {
                    to: phone + '@s.whatsapp.net',
                    sessionId: existingDevice.sessions[0].sessionId,
                },
                data: {
                    contactId: createdContact.pkId,
                },
            });

            await transaction.incomingMessage.updateMany({
                where: {
                    from: phone + '@s.whatsapp.net',
                    sessionId: existingDevice.sessions[0].sessionId,
                },
                data: {
                    contactId: createdContact.pkId,
                },
            });

            await transaction.contactDevice.create({
                data: {
                    contactId: createdContact.pkId,
                    deviceId: existingDevice.pkId,
                },
            });
            await useContact(transaction, subscription);
        });

        res.status(200).json({ message: 'Contact created successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const importContacts: RequestHandler = async (req, res) => {
    const subscription = req.subscription;
    const privilegeId = req.privilege.pkId;

    try {
        memoryUpload.single('file')(req, res, async (err) => {
            const results: any[] = [];
            const errors: any[] = [];
            if (err) {
                const message = 'An error occurred during file upload';
                logger.error(err, message);
                return res.status(500).json({ error: message });
            }
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }
            const workbook = new ExcelJS.Workbook();
            const buffer = req.file.buffer;
            const deviceId = req.body.deviceId;

            await workbook.xlsx.load(buffer);
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) {
                return res.status(400).json({ message: 'No worksheet found' });
            }

            const contacts: any[] = [];

            worksheet.eachRow((row, rowNumber) => {
                const firstName = row.getCell(1).value;
                const lastName = row.getCell(2).value;
                const phone = row.getCell(3).value?.toString();
                const email = row.getCell(4).value;
                const gender = row.getCell(5).value;
                const dob = row.getCell(6).value?.toString();
                const labels = row.getCell(7).value;
                if (!firstName || !phone) {
                    return res
                        .status(400)
                        .json({ message: 'firstName and phone values are required.' });
                }
                if (rowNumber !== 1) {
                    const contact = {
                        firstName,
                        lastName,
                        phone,
                        email,
                        gender,
                        dob,
                        labels,
                        colorCode: getRandomColor(),
                    };
                    contacts.push(contact);
                }
            });
            if (subscription.contactUsed + contacts.length > subscription.contactMax) {
                return res.status(404).json({
                    message: `Need more ${
                        subscription.contactUsed + contacts.length - subscription.contactMax
                    } contact quota to perform this action`,
                });
            }
            const pkId = req.authenticatedUser.pkId;
            for (let index = 0; index < contacts.length; index++) {
                const email = contacts[index].email?.text ?? contacts[index].email;
                try {
                    const existingContact = await prisma.contact.findFirst({
                        where: {
                            phone: contacts[index].phone,
                            AND: {
                                contactDevices: {
                                    some: {
                                        device: {
                                            id: deviceId,
                                            userId:
                                                privilegeId !== Number(process.env.SUPER_ADMIN_ID)
                                                    ? pkId
                                                    : undefined,
                                        },
                                    },
                                },
                            },
                        },
                    });

                    // contacts are saved per user (not per device)
                    if (existingContact) {
                        throw new Error(
                            'Contact with this email or phone number already exists in your contact',
                        );
                    }
                    await prisma.$transaction(async (transaction) => {
                        const createdContact = await transaction.contact.create({
                            data: {
                                firstName: contacts[index].firstName,
                                lastName: contacts[index].lastName,
                                phone: contacts[index].phone,
                                email,
                                gender: contacts[index].gender,
                                dob: contacts[index].dob ? new Date(contacts[index].dob) : null,
                                colorCode: getRandomColor(),
                            },
                        });

                        const existingDevice = await transaction.device.findUnique({
                            where: {
                                id: deviceId,
                            },
                            include: { sessions: { select: { sessionId: true } } },
                        });

                        if (!existingDevice) {
                            throw new Error('Device not found');
                        }
                        if (!existingDevice.sessions[0]) {
                            throw new Error('Session not found');
                        }

                        const labels = contacts[index].labels?.split(',') || null;

                        labels.push(`device_${existingDevice.name}`);
                        if (labels && labels.length > 0) {
                            const labelIds: number[] = [];

                            for (const labelName of labels) {
                                const slug = generateSlug(labelName);
                                const createdLabel = await transaction.label.upsert({
                                    where: {
                                        slug,
                                    },
                                    create: {
                                        name: labelName,
                                        slug,
                                    },
                                    update: {
                                        name: labelName,
                                        slug,
                                    },
                                });

                                labelIds.push(createdLabel.pkId);
                            }

                            await transaction.contactLabel.createMany({
                                data: labelIds.map((labelId) => ({
                                    contactId: createdContact.pkId,
                                    labelId: labelId,
                                })),
                                skipDuplicates: true,
                            });
                        }

                        await transaction.contactDevice.create({
                            data: {
                                contactId: createdContact.pkId,
                                deviceId: existingDevice.pkId,
                            },
                        });
                        await transaction.outgoingMessage.updateMany({
                            where: {
                                to: contacts[index].phone + '@s.whatsapp.net',
                                sessionId: existingDevice.sessions[0].sessionId,
                            },
                            data: {
                                contactId: createdContact.pkId,
                            },
                        });

                        await transaction.incomingMessage.updateMany({
                            where: {
                                from: contacts[index].phone + '@s.whatsapp.net',
                                sessionId: existingDevice.sessions[0].sessionId,
                            },
                            data: {
                                contactId: createdContact.pkId,
                            },
                        });
                        await useContact(transaction, subscription, subscription.contactUsed + 1);
                        subscription.contactUsed = subscription.contactUsed + 1;
                        results.push({ index, createdContact });
                    });
                } catch (error: unknown) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : 'An error occurred during import contacts';
                    errors.push({ index, error: message });
                }
            }
            res.status(200).json({ results, errors });
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getContacts: RequestHandler = async (req, res) => {
    const pkId = req.authenticatedUser.pkId;
    const privilegeId = req.privilege.pkId;
    const deviceId = req.query.deviceId as string;

    try {
        let contacts;
        if (privilegeId == Number(process.env.SUPER_ADMIN_ID)) {
            contacts = await prisma.contact.findMany({
                where: {
                    contactDevices: {
                        some: {
                            device: {
                                id: deviceId ?? undefined,
                            },
                        },
                    },
                },
                include: {
                    ContactLabel: {
                        select: {
                            label: {
                                select: { name: true },
                            },
                        },
                    },
                },
            });
        } else {
            contacts = await prisma.contact.findMany({
                where: {
                    contactDevices: {
                        some: {
                            device: {
                                id: deviceId ?? undefined,
                                userId: pkId,
                            },
                        },
                    },
                },
                include: {
                    ContactLabel: {
                        select: {
                            label: {
                                select: { name: true },
                            },
                        },
                    },
                },
            });
        }
        res.status(200).json(contacts);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getContactLabels: RequestHandler = async (req, res) => {
    const pkId = req.authenticatedUser.pkId;

    try {
        // const labels = await prisma.contact.findMany({
        //     where: { contactDevices: { some: { device: { userId: pkId } } } },
        //     select: {
        //         ContactLabel: {
        //             select: {
        //                 label: {
        //                     select: { name: true },
        //                 },
        //             },
        //         },
        //     },
        // });
        // const newLabels = labels.flatMap((item) => item.ContactLabel.map((obj) => obj.label.name));

        const labels = await prisma.label.findMany({
            where: {
                ContactLabel: {
                    some: { contact: { contactDevices: { some: { device: { userId: pkId } } } } },
                },
            },
        });

        res.status(200).json(labels.map((label) => label.name));
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// back here: display history, and media
export const getContact: RequestHandler = async (req, res) => {
    try {
        const contactId = req.params.contactId;

        const contact = await prisma.contact.findUnique({
            where: {
                id: contactId,
            },
            include: {
                ContactLabel: {
                    select: {
                        label: {
                            select: { name: true },
                        },
                    },
                },
                contactDevices: {
                    select: {
                        device: {
                            select: { name: true, id: true },
                        },
                    },
                },
                contactGroups: {
                    select: {
                        group: {
                            select: { name: true, id: true },
                        },
                    },
                },
            },
        });

        if (!contact) {
            res.status(404).json({ message: 'Contact not found' });
        }

        res.status(200).json(contact);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateContact: RequestHandler = async (req, res) => {
    try {
        const contactId = req.params.contactId;
        const { firstName, lastName, phone, email, gender, dob, labels, deviceId } = req.body;

        await prisma.$transaction(async (transaction) => {
            const existingContact = await prisma.contact.findUnique({
                where: {
                    id: contactId,
                },
                include: {
                    contactDevices: {
                        select: {
                            id: true,
                        },
                    },
                },
            });

            if (!existingContact) {
                return res.status(404).json({ message: 'Contact not found' });
            }

            // update contact
            const updatedContact = await transaction.contact.update({
                where: {
                    pkId: existingContact.pkId,
                },
                data: {
                    firstName,
                    lastName,
                    phone,
                    email,
                    gender,
                    dob: dob ? new Date(dob) : null,
                    updatedAt: new Date(),
                },
            });

            // update device
            const existingDevice = await transaction.device.findUnique({
                where: {
                    id: deviceId,
                },
            });

            if (!existingDevice) {
                throw new Error('Device not found');
            }

            await transaction.contactDevice.update({
                where: { id: existingContact.contactDevices[0].id },
                data: {
                    deviceId: existingDevice.pkId,
                },
            });

            // update labels
            labels.push(`device_${existingDevice.name}`);
            if (labels && labels.length > 0) {
                const labelIds: number[] = [];
                const slugs = labels.map((slug: string) => generateSlug(slug));

                await transaction.label.deleteMany({
                    where: {
                        ContactLabel: {
                            some: {
                                contactId: updatedContact.pkId,
                            },
                        },
                        NOT: {
                            slug: {
                                in: slugs,
                            },
                        },
                    },
                });

                for (const labelName of labels) {
                    const slug = generateSlug(labelName);
                    const createdLabel = await transaction.label.upsert({
                        where: {
                            slug,
                        },
                        create: {
                            name: labelName,
                            slug,
                        },
                        update: {
                            name: labelName,
                            slug,
                        },
                    });

                    labelIds.push(createdLabel.pkId);
                }

                // update contact-label
                await transaction.contactLabel.deleteMany({
                    where: {
                        contactId: updatedContact.pkId,
                    },
                });

                await transaction.contactLabel.createMany({
                    data: labelIds.map((labelId) => ({
                        contactId: updatedContact.pkId,
                        labelId: labelId,
                    })),
                    skipDuplicates: true,
                });
            } else {
                await transaction.label.deleteMany({
                    where: {
                        ContactLabel: {
                            some: {
                                contactId: updatedContact.pkId,
                            },
                        },
                    },
                });
            }
        });

        res.status(200).json({ message: 'Contact updated successfully' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteContacts: RequestHandler = async (req, res) => {
    try {
        const contactIds = req.body.contactIds;

        const contactPromises = contactIds.map(async (contactId: string) => {
            const existingContact = await prisma.contact.findUnique({
                where: {
                    id: contactId,
                },
            });

            if (!existingContact) {
                return res.status(404).json({ message: 'Contact not found' });
            }

            await prisma.contact.delete({
                where: {
                    pkId: existingContact.pkId,
                },
            });

            await prisma.label.deleteMany({
                where: {
                    NOT: {
                        ContactLabel: {
                            some: {
                                contactId: { not: existingContact.pkId },
                            },
                        },
                    },
                },
            });
        });

        // wait for all the Promises to settle (either resolve or reject)
        await Promise.all(contactPromises);

        res.status(200).json({ message: 'Device(s) deleted successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const addContactToGroup: RequestHandler = async (req, res) => {
    try {
        const { contactId, groupIds } = req.body;

        if (!contactId || !groupIds || groupIds.length === 0) {
            return res
                .status(400)
                .json({ message: 'Invalid input: contactId and groupIds are required' });
        }

        const contact = await prisma.contact.findUnique({
            where: {
                id: contactId,
            },
        });

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        const groupPromises = groupIds.map(async (groupId: string) => {
            const group = await prisma.group.findUnique({
                where: {
                    id: groupId,
                },
            });

            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            return prisma.contactGroup.create({
                data: {
                    groupId: group.pkId,
                    contactId: contact.pkId,
                },
            });
        });

        // wait for all the Promises to settle (either resolve or reject)
        await Promise.all(groupPromises);

        res.status(200).json({ message: 'Contact added to group(s) successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
