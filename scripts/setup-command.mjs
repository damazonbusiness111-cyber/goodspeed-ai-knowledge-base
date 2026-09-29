export function getNpmInstallInvocation({ execPath, npmExecPath, platform }) {
  if (npmExecPath) return { command: execPath, args: [npmExecPath, 'install'] };
  return { command: platform === 'win32' ? 'npm.cmd' : 'npm', args: ['install'] };
}
