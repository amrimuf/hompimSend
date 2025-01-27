import { PrismaClient } from '@prisma/client';
import { seedSubscriptionPlans } from './subscriptionPlan';
import { seedPrivileges } from './privilege';
import logger from '../../src/config/logger';

async function seedDatabase() {
    const prisma = new PrismaClient();

    try {
        await prisma.subscriptionPlan.deleteMany();
        await prisma.privilege.deleteMany();

        await seedSubscriptionPlans(prisma, logger);
        await seedPrivileges(prisma, logger);
    } catch (error) {
        logger.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

seedDatabase();
