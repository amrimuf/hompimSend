import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import { jwtSecretKey } from '../utils/jwtGenerator';
import { User } from '@prisma/client';

export const authMiddleware: RequestHandler = (req, res, next) => {
    if (!req.header('Authorization')) {
        apiKey(req, res, next);
    } else {
        accessToken(req, res, next);
    }
};

export const accessToken: RequestHandler = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication failed: Missing or invalid token' });
    }

    const token = authHeader.substring('Bearer '.length);

    if (!token) {
        return res.status(401).json({ error: 'Authentication failed: Invalid token' });
    }

    jwt.verify(token, jwtSecretKey, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Authentication failed: Invalid token' });
        }
        const email = (decoded as User).email;

        let thisUser;

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
            include: { privilege: true },
        });

        thisUser = user;

        if (!user) {
            const cs = await prisma.customerService.findUnique({
                where: {
                    email,
                },
                include: { privilege: true },
            });

            thisUser = cs;
        }

        if (!thisUser) {
            return res.status(401).json({ message: 'Authentication failed: Invalid API key' });
        }

        if (!thisUser.privilege) {
            return res
                .status(401)
                .json({ message: 'Access denied: User does not have a privilege' });
        }

        req.authenticatedUser = thisUser;
        req.privilege = thisUser.privilege;
        next();
    });
};

export const apiKey: RequestHandler = async (req, res, next) => {
    const apiKey = req.header('X-HompimSend-Key');

    if (!apiKey) {
        return res.status(401).json({ message: 'Authentication failed: Missing API key' });
    }
    const user = await prisma.user.findUnique({
        where: {
            accountApiKey: apiKey,
        },
        include: { privilege: true },
    });

    if (!user) {
        return res.status(401).json({ message: 'Authentication failed: Invalid API key' });
    }

    if (!user.privilege) {
        return res.status(401).json({ message: 'Access denied: User does not have a privilege' });
    }

    req.authenticatedUser = user;
    req.privilege = user.privilege;
    next();
};

// to protect super admin routes
export const superAdminOnly: RequestHandler = async (req, res, next) => {
    if (req.privilege.pkId === Number(process.env.SUPER_ADMIN_ID)) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Super admin only' });
    }
};

// to protect controllers based on user privilege roles
// eg: users with non-super admin privilege can't perform user deletion
export function checkPrivilege(controller: string): RequestHandler {
    return async (req, res, next) => {
        const method = req.method.toLowerCase();

        let thisUser;

        const user = await prisma.user.findUnique({
            where: { id: req.authenticatedUser.id },
            select: { privilege: { select: { roles: { include: { module: true } } } } },
        });
        thisUser = user;

        if (!user) {
            const cs = await prisma.customerService.findUnique({
                where: { id: req.authenticatedUser.id },
                select: { privilege: { select: { roles: { include: { module: true } } } } },
            });

            thisUser = cs;
        }

        if (!thisUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userRoles = thisUser.privilege?.roles;

        if (!userRoles) {
            return res
                .status(403)
                .json({ message: "Access denied. You haven't been assigned to any roles" });
        }

        const hasRequiredPrivilege = userRoles.some((role) => {
            if (method === 'post' && role.isCreate) {
                return role.module.controller === controller;
            }
            if (method === 'get' && role.isRead) {
                return role.module.controller === controller;
            }
            if (['put', 'patch'].includes(method) && role.isEdit) {
                return role.module.controller === controller;
            }
            if (method === 'delete' && role.isDelete) {
                return role.module.controller === controller;
            }
            return false;
        });

        if (hasRequiredPrivilege) {
            next();
        } else {
            res.status(403).json({
                message:
                    'Access denied. You do not have the required privileges to perform this action',
            });
        }
    };
}

export const isEmailVerified: RequestHandler = async (req, res, next) => {
    const user = await prisma.user.findUnique({
        where: { id: req.authenticatedUser.id },
        select: { emailVerifiedAt: true },
    });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (user && user.emailVerifiedAt) {
        next();
    } else {
        res.status(403).json({ message: 'Email not verified yet' });
    }
};

export default authMiddleware;
