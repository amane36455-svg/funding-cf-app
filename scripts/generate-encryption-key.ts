import { randomBytes } from 'node:crypto';

process.stdout.write(`TOKEN_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}\n`);
