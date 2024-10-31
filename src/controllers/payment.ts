import { RequestHandler } from 'express';
import prisma from '../utils/db';
import logger from '../config/logger';
import axios from 'axios';
import moment from 'moment-timezone';
import { isUUID } from '../utils/uuidChecker';

export const pay: RequestHandler = async (req, res) => {
    try {
        const url = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
        const apiKey = process.env.MIDTRANS_KEY!;
        const user = req.authenticatedUser;

        const { subscriptionPlanId, subscriptionPlanType } = req.body;

        if (!subscriptionPlanId || !subscriptionPlanType) {
            return res.status(400).json({ error: 'Invalid payment data' });
        }

        const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
            where: { id: subscriptionPlanId },
        });

        if (!subscriptionPlan) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        const paidPrice =
            subscriptionPlanType == 'monthly'
                ? subscriptionPlan?.monthlyPrice
                : subscriptionPlan?.yearlyPrice;

        if (paidPrice === null || paidPrice === undefined) {
            return res.status(400).json({ error: 'Invalid subscriptionType' });
        }

        const order_id = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        const start_time = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss ZZ');

        const requestBody = {
            transaction_details: {
                order_id,
                gross_amount: paidPrice,
            },
            item_details: [
                {
                    id: subscriptionPlanId,
                    price: paidPrice,
                    quantity: 1,
                    name: subscriptionPlan?.name,
                    brand: 'HompimSend',
                    category: 'Subscription',
                    merchant_name: 'HompimSend',
                },
            ],
            customer_details: {
                first_name: user.firstName,
                last_name: user.lastName,
                email: user.email,
                phone: user.phone,
                billing_address: {
                    first_name: user.firstName,
                    last_name: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    address: 'Sudirman',
                    city: 'Jakarta',
                    postal_code: '12190',
                    country_code: 'IDN',
                },
                shipping_address: {
                    first_name: user.firstName,
                    last_name: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    address: 'Sudirman',
                    city: 'Jakarta',
                    postal_code: '12190',
                    country_code: 'IDN',
                },
            },
            enabled_payments: [
                'credit_card',
                'mandiri_clickpay',
                'cimb_clicks',
                'bca_klikbca',
                'bca_klikpay',
                'bri_epay',
                'echannel',
                'mandiri_ecash',
                'permata_va',
                'bca_va',
                'bni_va',
                'other_va',
                'gopay',
                'indomaret',
                'alfamart',
                'danamon_online',
                'akulaku',
            ],
            credit_card: {
                secure: true,
                bank: 'bca',
                installment: {
                    required: false,
                    terms: {
                        bni: [3, 6, 12],
                        mandiri: [3, 6, 12],
                        cimb: [3],
                        bca: [3, 6, 12],
                        offline: [6, 12],
                    },
                },
                whitelist_bins: ['48111111', '41111111'],
            },
            bca_va: {
                va_number: '12345678911',
                sub_company_code: '00000',
                free_text: {
                    inquiry: [
                        {
                            en: 'text in English',
                            id: 'text in Bahasa Indonesia',
                        },
                    ],
                    payment: [
                        {
                            en: 'text in English',
                            id: 'text in Bahasa Indonesia',
                        },
                    ],
                },
            },
            bni_va: {
                va_number: '12345678',
            },
            permata_va: {
                va_number: '1234567890',
                recipient_name: 'SUDARSONO',
            },
            callbacks: {
                finish: 'https://forwardin.adslink.id',
            },
            expiry: {
                start_time,
                unit: 'minutes',
                duration: 10,
            },
            custom_field1: user.id,
            custom_field2: subscriptionPlanId,
            custom_field3: subscriptionPlanType,
        };

        logger.debug(requestBody);

        const config = {
            headers: {
                Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
                'Content-Type': 'application/json',
            },
        };

        await prisma.transaction.create({
            data: {
                id: order_id,
                paidPrice,
                status: 'pending',
                userId: user.pkId,
                subscriptionPlanId: subscriptionPlan.pkId,
            },
        });

        const response = await axios.post(url, requestBody, config);
        res.status(200).json(response.data);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// after the midtrans payment process is successful,
export const handleNotification: RequestHandler = async (req, res) => {
    try {
        const {
            order_id,
            transaction_status,
            transaction_time,
            gross_amount,
            custom_field1,
            custom_field2,
            custom_field3,
        } = req.body;

        if (
            !order_id ||
            !transaction_status ||
            !transaction_time ||
            !gross_amount ||
            !custom_field1 ||
            !custom_field2 ||
            !custom_field3
        ) {
            return res.status(200).json({ message: 'Invalid notification data' });
        }

        const transaction_time_iso = new Date(transaction_time).toISOString();
        const oneMonthLater = new Date(
            new Date(transaction_time).setMonth(new Date(transaction_time).getMonth() + 1),
        );
        const oneMonthLaterISO = oneMonthLater.toISOString();
        const oneYearLater = new Date(
            new Date(transaction_time).setFullYear(new Date(transaction_time).getFullYear() + 1),
        );
        const oneYearLaterISO = oneYearLater.toISOString();

        const user = await prisma.user.findUnique({
            where: { id: custom_field1 },
        });

        const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
            where: { id: custom_field2 },
        });

        if (!subscriptionPlan) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const transaction = await prisma.transaction.update({
            where: { id: order_id },
            data: {
                status: transaction_status,
                updatedAt: new Date(),
            },
        });

        if (transaction.status == 'settlement' || transaction.status == 'success') {
            await prisma.$transaction(async (transaction) => {
                await transaction.subscription.create({
                    data: {
                        startDate: transaction_time_iso,
                        endDate: custom_field3 == 'yearly' ? oneYearLaterISO : oneMonthLaterISO,
                        autoReplyMax: subscriptionPlan.autoReplyQuota || 0,
                        deviceMax: subscriptionPlan.deviceQuota || 0,
                        contactMax: subscriptionPlan.contactQuota || 0,
                        broadcastMax: subscriptionPlan.broadcastQuota || 0,
                        userId: user.pkId,
                        subscriptionPlanId: subscriptionPlan.pkId,
                    },
                });
            });
            return res.status(200).json({ message: 'Subscription created successfully' });
        }
        return res.status(200).json({ message: 'Transaction status updated successfully' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const subscribeToTrial: RequestHandler = async (req, res) => {
    const userId = req.authenticatedUser.pkId;
    const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
        where: { name: 'starter' },
    });

    if (!subscriptionPlan) {
        return res.status(404).json({ message: 'Subscription not found' });
    }

    const existingTrialSubscription = await prisma.subscription.findFirst({
        where: { userId, subscriptionPlanId: subscriptionPlan.pkId },
    });

    const startDate = new Date();
    const oneWeekLater = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (existingTrialSubscription) {
        res.status(403).json({ message: 'Trial subscription already used' });
    } else {
        await prisma.subscription.create({
            data: {
                startDate,
                endDate: oneWeekLater,
                autoReplyMax: subscriptionPlan.autoReplyQuota || 0,
                deviceMax: subscriptionPlan.deviceQuota || 0,
                contactMax: subscriptionPlan.contactQuota || 0,
                broadcastMax: subscriptionPlan.broadcastQuota || 0,
                userId,
                subscriptionPlanId: subscriptionPlan.pkId,
            },
        });
        return res.status(200).json({ message: 'Trial subscription created successfully' });
    }
};

export const getSubscriptions: RequestHandler = async (req, res) => {
    try {
        const subscriptions = await prisma.subscriptionPlan.findMany({
            where: { isAvailable: true },
            select: {
                id: true,
                name: true,
                monthlyPrice: true,
                yearlyPrice: true,
                autoReplyQuota: true,
                broadcastQuota: true,
                contactQuota: true,
                deviceQuota: true,
                isGoogleContactSync: true,
                isIntegration: true,
                isWhatsappContactSync: true,
            },
        });
        res.status(200).json(subscriptions);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getSubscription: RequestHandler = async (req, res) => {
    try {
        const subscriptionId = req.params.subscriptionId;

        if (!isUUID(subscriptionId)) {
            return res.status(400).json({ message: 'Invalid subscriptionId' });
        }

        const subscription = await prisma.subscriptionPlan.findMany({
            where: { isAvailable: true, id: subscriptionId },
            select: {
                id: true,
                name: true,
                monthlyPrice: true,
                yearlyPrice: true,
                autoReplyQuota: true,
                broadcastQuota: true,
                contactQuota: true,
                deviceQuota: true,
                isGoogleContactSync: true,
                isIntegration: true,
                isWhatsappContactSync: true,
            },
        });
        res.status(200).json(subscription);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getTransactions: RequestHandler = async (req, res) => {
    try {
        const userId = req.authenticatedUser.pkId;

        const transactions = await prisma.transaction.findMany({
            where: { userId },
        });
        res.status(200).json(transactions);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getTransactionStatus: RequestHandler = async (req, res) => {
    try {
        const id = req.params.transactionId;

        if (!isUUID(id)) {
            return res.status(400).json({ message: 'Invalid subscriptionId' });
        }

        const transactions = await prisma.transaction.findUnique({
            where: { id },
        });

        if (!transactions) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        res.status(200).json({ status: transactions.status });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
