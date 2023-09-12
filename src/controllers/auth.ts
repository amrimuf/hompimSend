import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateApiKey } from '../utils/apiKeyGenerator';
import {
    decodeJwtToken,
    extractUserIdAndEmailFromToken,
    generateAccessToken,
    generateRefreshToken,
} from '../utils/jwtGenerator';
import { generateOTPSecret, generateOTPToken, sendEmail, verifyOTPToken } from '../utils/otpHelper';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { DecodedToken } from '../types';

const prisma = new PrismaClient();
const jwtSecretKey = process.env.JWT_SECRET_KEY!;

export const register = async (req: Request, res: Response) => {
    try {
        const { username, phone, email, password, confirmPassword } = req.body;
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }, { phone }],
            },
        });

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (existingUser) {
            return res
                .status(400)
                .json({ message: 'User with this username, email, or phone already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const existingSubscription = await prisma.subscription.findUnique({
            where: { pkId: 100 },
        });

        const existingPrivilege = await prisma.privilege.findUnique({
            where: { pkId: 1 },
        });

        if (existingSubscription && existingPrivilege) {
            const newUser = await prisma.user.create({
                data: {
                    username,
                    phone,
                    email,
                    password: hashedPassword,
                    accountApiKey: generateApiKey(),
                    affiliationCode: username,
                    emailVerifiedAt: new Date(),
                    subscription: { connect: { pkId: 1 } },
                    privilege: { connect: { pkId: 1 } },
                },
            });

            const accessToken = generateAccessToken(newUser);
            const refreshToken = generateRefreshToken(newUser);

            await prisma.user.update({
                where: { pkId: newUser.pkId },
                data: { refreshToken: refreshToken },
            });
            res.status(201).json({ accessToken, refreshToken });
        } else {
            return res.status(404).json({
                error: 'Subscription or privilege not found',
            });
        }
    } catch (error) {
        req.log.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const checkIdentifierAvailability = async (req: Request, res: Response) => {
    try {
        const { username, email, phone } = req.body;

        if (!username && !email && !phone) {
            return res.status(400).json({ message: 'No identifier provided in the request body' });
        }

        let identifierField, identifierType;

        if (username) {
            identifierField = username;
            identifierType = 'Username';
        } else if (email) {
            identifierField = email;
            identifierType = 'Email';
        } else if (phone) {
            identifierField = phone;
            identifierType = 'Phone number';
        }

        if (await isIdentifierTaken(identifierField)) {
            return res.status(400).json({ message: `${identifierType} is already taken` });
        }

        res.status(200).json({ message: `${identifierType} is available` });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const isIdentifierTaken = async (identifier: string) => {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ username: identifier }, { email: identifier }, { phone: identifier }],
        },
    });
    return !!existingUser;
};

export const login = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { identifier, password } = req.body;

        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { username: identifier }, { phone: identifier }],
            },
        });

        if (!user) {
            return res.status(401).json({ message: 'Account not found' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Wrong password' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await prisma.user.update({
            where: { pkId: user.pkId },
            data: { refreshToken },
        });

        return res.status(200).json({ accessToken, refreshToken });
    } catch (error) {
        req.log.error('Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        jwt.verify(refreshToken, jwtSecretKey, async (err: unknown, decoded: unknown) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid refresh token' });
            }

            if (!decoded) {
                return res.status(401).json({ message: 'Decoded token is missing' });
            }

            const userId = (decoded as DecodedToken).userId;

            const user = await prisma.user.findUnique({
                where: { pkId: userId },
            });

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            const accessToken = generateAccessToken(user);

            res.status(200).json({ accessToken });
        });
    } catch (error) {
        req.log.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const sendVerificationEmail = async (req: Request, res: Response) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: JWT token missing' });
        }

        const decodedToken = decodeJwtToken(token, jwtSecretKey);
        const tokenData = extractUserIdAndEmailFromToken(token, jwtSecretKey);

        if (!decodedToken || !tokenData) {
            return res.status(401).json({ message: 'Unauthorized: Invalid or expired JWT token' });
        }
        const { userId, email } = tokenData;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res
                .status(404)
                .json({ message: 'Email address does not exist in our database' });
        }

        const otpSecret = generateOTPSecret();
        const otpToken = generateOTPToken(otpSecret);

        await prisma.user.update({
            where: { pkId: userId },
            data: { emailOtpSecret: otpSecret, email },
        });

        await sendEmail(email, otpToken);
        res.status(200).json({ message: 'Verification email sent successfully', otpToken });
    } catch (error) {
        req.log.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: JWT token missing' });
        }

        const decodedToken = decodeJwtToken(token, jwtSecretKey);
        const tokenData = extractUserIdAndEmailFromToken(token, jwtSecretKey);

        if (!decodedToken || !tokenData) {
            return res.status(401).json({ message: 'Unauthorized: Invalid or expired JWT token' });
        }

        const { userId } = tokenData;

        const otpToken = String(req.body.otpToken);

        const user = await prisma.user.findUnique({
            where: { pkId: userId },
            select: { emailOtpSecret: true },
        });

        if (!user || !user.emailOtpSecret) {
            return res.status(401).json({ message: 'User not found or OTP secret missing' });
        }

        const isValid = verifyOTPToken(user.emailOtpSecret, otpToken);

        if (isValid) {
            await prisma.user.update({
                where: { pkId: userId },
                data: { emailVerifiedAt: new Date() },
            });
            return res.status(200).json({ message: 'Email verification successful' });
        } else {
            return res.status(401).json({ message: 'Invalid OTP token' });
        }
    } catch (error) {
        req.log.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: JWT token missing' });
        }

        const decodedToken = decodeJwtToken(token, jwtSecretKey);
        const tokenData = extractUserIdAndEmailFromToken(token, jwtSecretKey);

        if (!decodedToken || !tokenData) {
            return res.status(401).json({ message: 'Unauthorized: Invalid or expired JWT token' });
        }

        const { email } = tokenData;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res
                .status(404)
                .json({ message: 'Email address does not exist in our database' });
        }

        // back here
        const resetToken = generateApiKey();

        await prisma.passwordReset.upsert({
            where: { email },
            create: {
                email,
                token: resetToken,
                resetTokenExpires: new Date(Date.now() + 3600000), // Expires in 1 hour
            },
            update: {
                token: resetToken,
                resetTokenExpires: new Date(Date.now() + 3600000), // Expires in 1 hour
            },
        });

        // back here: send token to user's email

        res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
        req.log.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<Response | undefined> => {
    try {
        const { email, resetToken, password } = req.body;
        const resetInfo = await prisma.passwordReset.findUnique({
            where: {
                email,
            },
        });

        if (
            !resetInfo ||
            resetInfo.token !== resetToken ||
            resetInfo.resetTokenExpires <= new Date()
        ) {
            return res.status(401).json({ message: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.passwordReset.delete({
            where: {
                email,
            },
        });

        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
            },
        });

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        req.log.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const changePassword = async (
    req: Request,
    res: Response,
): Promise<Response | undefined> => {
    try {
        const { email, currentPassword, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
            },
        });

        res.status(200).json({ message: 'Password change successful' });
    } catch (error) {
        req.log.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};