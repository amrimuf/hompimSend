/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { generateUuid } from '../utils/keyGenerator';
import { generateAccessToken, generateRefreshToken, jwtSecretKey } from '../utils/jwtGenerator';
import { generateOTPSecret, generateOTPToken, sendEmail, verifyOTPToken } from '../utils/otpHelper';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import axios from 'axios';
import logger from '../config/logger';
import { refreshTokenPayload } from '../types';
import refresh from 'passport-oauth2-refresh';

export const register: RequestHandler = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            username,
            phone,
            email,
            role = Number(process.env.ADMIN_ID),
            password,
            confirmPassword,
        } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }, { phone }],
            },
        });
        if (existingUser) {
            return res
                .status(400)
                .json({ message: 'User with this username, email, or phone already exists' });
        }

        const existingPrivilege = await prisma.privilege.findUnique({
            where: { pkId: role },
        });
        if (!existingPrivilege) {
            return res.status(404).json({
                error: 'Privilege or role not found',
            });
        }
        const newUser = await prisma.user.create({
            data: {
                username,
                firstName,
                lastName,
                phone,
                email,
                password: hashedPassword,
                accountApiKey: generateUuid(),
                affiliationCode: username,
                privilege: { connect: { pkId: role } },
            },
        });

        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);
        const accountApiKey = newUser.accountApiKey;
        const id = newUser.id;

        await prisma.user.update({
            where: { pkId: newUser.pkId },
            data: { refreshToken },
        });
        res.status(201).json({
            accessToken,
            refreshToken,
            accountApiKey,
            id,
            role: newUser.privilegeId,
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const checkIdentifierAvailability: RequestHandler = async (req, res) => {
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
        logger.error(error);
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

export const login: RequestHandler = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier, deletedAt: null },
                    { phone: identifier, deletedAt: null },
                    { username: identifier, deletedAt: null },
                    { googleId: identifier, deletedAt: null },
                ],
            },
        });

        if (!user) {
            return res.status(401).json({ message: 'Account not found or has been deleted' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Wrong password' });
        }

        const accessToken = generateAccessToken(user);
        // const refreshToken = user.refreshToken;
        const refreshToken = generateRefreshToken(user);
        const id = user.id;

        await prisma.user.update({
            where: { pkId: user.pkId },
            data: { refreshToken },
        });

        return res.status(200).json({ accessToken, refreshToken, id, role: user.privilegeId });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const refreshToken: RequestHandler = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        jwt.verify(refreshToken, jwtSecretKey, async (err: unknown, decoded: unknown) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid refresh token' });
            }
            if (!decoded || !(decoded as refreshTokenPayload).id) {
                return res.status(401).json({ message: 'Decoded token is missing' });
            }

            const userId = (decoded as refreshTokenPayload).id;

            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                const cs = await prisma.customerService.findUnique({
                    where: { id: userId },
                });

                if (!cs) {
                    return res.status(401).json({ message: 'User not found' });
                }

                const accessToken = generateAccessToken(cs);
                const id = cs.id;

                return res.status(200).json({ accessToken, id });
            }

            const accessToken = generateAccessToken(user);
            const id = user.id;

            return res.status(200).json({ accessToken, id });
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const sendVerificationEmail: RequestHandler = async (req, res) => {
    try {
        const user = req.authenticatedUser;
        const email = req.authenticatedUser.email;

        if (!user) {
            return res
                .status(404)
                .json({ message: 'Email address does not exist in our database' });
        }

        const otpSecret = generateOTPSecret();
        const otpToken = generateOTPToken(otpSecret);
        const body = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
        </head>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Email Verification</h2>
                <p>Hello, ${user.firstName}!</p>
                <p>
                    Thank you for signing up! To complete your registration, please use the following 6-digit verification code:
                </p>
                <h1 style="font-size: 36px; font-weight: bold; color: #007BFF;">${otpToken}</h1>
                <p>
                    This verification code will expire in 30 seconds. If you didn't sign up for our service, you can safely ignore this email.
                </p>
                <p>Best regards,</p>
                <p>HompimSend</p>
            </div>
        </body>
        </html>
        `;

        await prisma.user.update({
            where: { pkId: user.pkId },
            data: { emailOtpSecret: otpSecret, email, updatedAt: new Date() },
        });

        await sendEmail(email, body, 'Verify your email');
        res.status(200).json({ message: 'Verification email sent successfully', otpToken });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const verifyEmail: RequestHandler = async (req, res) => {
    try {
        const pkId = req.authenticatedUser.pkId;
        const otpToken = String(req.body.otpToken);

        const user = await prisma.user.findUnique({
            where: { pkId: pkId },
            select: { emailOtpSecret: true },
        });

        if (!user || !user.emailOtpSecret) {
            return res.status(401).json({ message: 'User not found or OTP secret missing' });
        }

        const isValid = verifyOTPToken(user.emailOtpSecret, otpToken);

        if (isValid) {
            await prisma.user.update({
                where: { pkId: pkId },
                data: { emailVerifiedAt: new Date(), updatedAt: new Date() },
            });
            return res.status(200).json({ message: 'Email verification successful' });
        } else {
            return res.status(401).json({ message: 'Invalid OTP token' });
        }
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const forgotPassword: RequestHandler = async (req, res) => {
    try {
        const email = req.body.email;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res
                .status(404)
                .json({ message: 'Email address does not exist in our database' });
        }

        const resetTokenSecret = generateOTPSecret();
        // const resetToken = generateOTPToken(resetTokenSecret);
        const body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
    </head>
    <body>
        <table align="center" cellpadding="0" cellspacing="0" width="600">
            <tr>
                <td align="center" bgcolor="#0073e6" style="padding: 40px 0;">
                    <h1 style="color: #ffffff;">Password Reset</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px;">
                    <p>Hello, ${user.firstName}!</p>
                    <p>We received a request to reset your password. To reset your password, click the link below:</p>
                    <p>
                        <a href="https://forwardin.adslink.id/auth/reset-password?token=${resetTokenSecret}" style="background-color: #0073e6; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    </p>
                    <p><strong>Note:</strong> This reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
                    <p>If you have any questions or need further assistance, please contact our support team.</p>
                    <p>Thank you!</p>
                </td>
            </tr>
            <tr>
                <td align="center" bgcolor="#f4f4f4" style="padding: 20px;">
                    <p style="color: #333333; font-size: 12px;">&copy; 2023 HompimSend</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
`;

        await prisma.passwordReset.upsert({
            where: { email },
            create: {
                email,
                token: resetTokenSecret,
                resetTokenExpires: new Date(Date.now() + 3600000), // Expires in 1 hour
            },
            update: {
                token: resetTokenSecret,
                resetTokenExpires: new Date(Date.now() + 3600000), // Expires in 1 hour
            },
        });

        await sendEmail(email, body, 'Reset password');
        res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const resetPassword: RequestHandler = async (req, res) => {
    try {
        const { resetToken, password } = req.body;
        const resetInfo = await prisma.passwordReset.findUnique({
            where: {
                token: resetToken,
            },
        });

        if (
            !resetInfo ||
            resetInfo.token !== resetToken ||
            resetInfo.resetTokenExpires <= new Date()
        ) {
            return res.status(401).json({ message: 'Invalid or expired reset token' });
        }

        const email = resetInfo.email;
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
                updatedAt: new Date(),
            },
        });

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const changePassword: RequestHandler = async (req, res) => {
    try {
        const { currentPassword, password, confirmPassword } = req.body;

        const email = req.authenticatedUser.email;
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
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
                updatedAt: new Date(),
            },
        });

        res.status(200).json({ message: 'Password change successful' });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// mock get google access token by client
const strategy = new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL:
            process.env.NODE_ENV !== 'production'
                ? `http://${process.env.HOST}:${process.env.PORT}/auth/google/callback`
                : `https://${process.env.BASE_URL}/auth/google/callback`,
    },
    async (accessToken: any, refreshToken: any, profile: Profile, done: any) => {
        try {
            logger.warn(refreshToken);
            return done(null, accessToken);
        } catch (error: any) {
            return done(error, false);
        }
    },
);

passport.use(strategy);
refresh.use(strategy);

export const googleAuth = passport.authenticate('google', {
    scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/user.phonenumbers.read',
        'https://www.googleapis.com/auth/contacts',
        'https://www.googleapis.com/auth/contacts.readonly',
    ],
});
export const googleAuthCallback: RequestHandler = (req, res, next) => {
    passport.authenticate('google', { session: true }, async (err, accessToken) => {
        try {
            if (err) {
                return res.status(500).json({ message: err.message });
            }

            if (!accessToken) {
                return res.status(401).json({ message: 'Authentication failed' });
            }

            res.status(200).json({ accessToken });
        } catch (error) {
            return res.status(500).json({ message: 'Internal erver error' });
        }
    })(req, res, next);
};

// back here: separate email account & oAuth google email
export const loginRegisterByGoogle: RequestHandler = async (req, res) => {
    const accessToken = req.body.accessToken;
    const apiEndpoint =
        'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos,phoneNumbers,birthdays';
    try {
        const response = await axios.get(apiEndpoint, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (response.status === 200) {
            const profileData = response.data;

            const existingPrivilege = await prisma.privilege.findUnique({
                where: { pkId: Number(process.env.ADMIN_ID) },
            });

            if (!profileData.emailAddresses || !profileData.names) {
                return res.status(400).json({ message: 'Missing some profile data' });
            }

            const googleId = profileData.names[0].metadata.source.id;
            const username = profileData.emailAddresses[0].value.split('@')[0];
            const email = profileData.emailAddresses[0].value;
            const phones = profileData.phoneNumbers || [];
            const phone = phones.length > 0 ? phones[0].canonicalForm?.replace(/\+/g, '') : null;
            const nameParts = profileData.names[0].displayNameLastFirst.split(',');
            const lastName = nameParts.length > 1 ? nameParts[0].trim() : null;
            const firstName = lastName ? nameParts[1].trim() : nameParts[0].trim();

            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email, deletedAt: null },
                        { phone, deletedAt: null },
                        { username, deletedAt: null },
                        { googleId, deletedAt: null },
                    ],
                },
            });

            // forbid deleted user
            if (!user) {
                return res.status(401).json({ message: 'Account not found or has been deleted' });
            }

            const oAuthRegisteredUser = await prisma.user.findUnique({
                where: { googleId },
            });

            // login
            if (oAuthRegisteredUser) {
                const accessToken = generateAccessToken(oAuthRegisteredUser);
                // const refreshToken = oAuthRegisteredUser.refreshToken;
                const refreshToken = generateRefreshToken(oAuthRegisteredUser);
                const id = oAuthRegisteredUser.id;

                await prisma.user.update({
                    where: { pkId: oAuthRegisteredUser.pkId },
                    data: { refreshToken },
                });
                return res
                    .status(200)
                    .json({ accessToken, refreshToken, id, role: oAuthRegisteredUser.privilegeId });
            }

            if (!existingPrivilege) {
                return res.status(404).json({
                    error: 'Privilege or role not found',
                });
            }

            // register user from start or connect existing user to google
            const newUser = await prisma.user.upsert({
                where: { email },
                create: {
                    googleId,
                    username,
                    firstName,
                    lastName,
                    accountApiKey: generateUuid(),
                    phone,
                    affiliationCode: username,
                    privilege: { connect: { pkId: existingPrivilege.pkId } },
                    email,
                    password: '',
                    emailVerifiedAt: new Date(),
                },
                update: {
                    googleId,
                },
            });

            const accessToken = generateAccessToken(newUser);
            const accountApiKey = newUser.accountApiKey;
            const id = newUser.id;
            let refreshToken;

            if (!newUser.refreshToken) {
                refreshToken = generateRefreshToken(newUser);
                await prisma.user.update({
                    where: { pkId: newUser.pkId },
                    data: { refreshToken },
                });
            } else {
                refreshToken = newUser.refreshToken;
            }
            res.status(201).json({
                accessToken,
                refreshToken,
                accountApiKey,
                id,
                role: newUser.privilegeId,
            });
        } else {
            const errorMessage = response.data?.error?.message || 'Unknown Error';
            res.status(response.status).json({ error: errorMessage });
        }
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
