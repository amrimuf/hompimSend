import express from 'express';
import cors from 'cors';
import routes from './routes';
import logger from './config/logger';
import pinoHttp from 'pino-http';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json());
app.use('/', routes);
app.all('*', (req, res) => res.status(404).json({ error: 'URL not found' }));

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const listener = () => logger.info(`Server is listening on http://${host}:${port}`);

const prisma = new PrismaClient();
prisma
    .$connect()
    .then(() => {
        logger.info('Connected to the database server');
    })
    .catch((error) => {
        logger.error('Failed to connect to the database server:', error);
        process.exit(1);
    });

app.listen(port, host, listener);

// (async () => {
//   await init();
//   app.listen(port, host, listener);
// })();

export default app;
