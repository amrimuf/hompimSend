import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import 'dotenv/config';

export const jwtSecretKey = process.env.JWT_SECRET_KEY!;

export function generateAccessToken(user: User): string {
    const payload = {
        email: user.email,
    };

    return jwt.sign(payload, jwtSecretKey, { expiresIn: '15m' });
}

export function generateRefreshToken(user: User): string {
    const payload = {
        pkId: user.pkId,
    };

    return jwt.sign(payload, jwtSecretKey, { expiresIn: '7d' });
}
