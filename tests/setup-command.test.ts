import assert from 'node:assert/strict';
import test from 'node:test';
import { getNpmInstallInvocation } from '../scripts/setup-command.mjs';

test('setup invokes npm through Node when npm supplies its CLI path', () => {
  assert.deepEqual(getNpmInstallInvocation({
    execPath: 'C:\\Program Files\\nodejs\\node.exe',
    npmExecPath: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
    platform: 'win32',
  }), {
    command: 'C:\\Program Files\\nodejs\\node.exe',
    args: ['C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js', 'install'],
  });
});

test('setup retains a portable npm fallback outside npm-run context', () => {
  assert.deepEqual(getNpmInstallInvocation({
    execPath: '/usr/bin/node',
    platform: 'linux',
  }), {
    command: 'npm',
    args: ['install'],
  });
});
