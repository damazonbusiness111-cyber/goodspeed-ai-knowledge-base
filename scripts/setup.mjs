import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { getNpmInstallInvocation } from './setup-command.mjs';

const invocation = getNpmInstallInvocation({
  execPath: process.execPath,
  npmExecPath: process.env.npm_execpath,
  platform: process.platform,
});
const install = spawnSync(invocation.command, invocation.args, {
  stdio: 'inherit',
});
if (install.error) {
  console.error(`Could not start npm install: ${install.error.message}`);
  process.exit(1);
}
if (install.status !== 0) process.exit(install.status ?? 1);

const example = readFileSync('.env.example', 'utf8');
const entries = example.split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
const web = entries.filter((line) => line.startsWith('NEXT_PUBLIC_'));
const api = entries.filter((line) => !line.startsWith('NEXT_PUBLIC_'));
if (!existsSync('apps/api/.env')) writeFileSync('apps/api/.env', `${api.join('\n')}\n`, { mode: 0o600 });
if (!existsSync('apps/web/.env.local')) writeFileSync('apps/web/.env.local', `${web.join('\n')}\n`, { mode: 0o600 });

console.log('\nSetup complete. Fill in the env values, apply the Supabase migration, then run: npm run dev');
