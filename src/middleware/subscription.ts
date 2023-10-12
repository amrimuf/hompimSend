import { RequestHandler } from 'express';

export const isPremiumMember: RequestHandler = (req, res, next) => {
    if (req.prismaUser && req.prismaUser.subscriptionId === 2) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Premium membership required' });
    }
};
