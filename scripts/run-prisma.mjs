import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve('prisma/build/index.js');
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [prismaCliPath, ...args], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
