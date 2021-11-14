import os from 'os';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

import { sync as resolve } from 'resolve';
import { npm, yarn } from 'global-dirs';

export function cmdExists(cmd: string): boolean {
  try {
    execSync(
      os.platform() === 'win32'
        ? `cmd /c "(help ${cmd} > nul || exit 0) && where ${cmd} > nul 2> nul"`
        : `command -v ${cmd}`
    );
    return true;
  } catch {
    return false;
  }
}

export function resolveImportPath(importName: string, ensure: true): string;
export function resolveImportPath(
  importName: string,
  ensure?: boolean
): string | undefined;
export function resolveImportPath(
  importName: string,
  ensure = false
): string | undefined {
  try {
    return resolve(importName, {
      preserveSymlinks: false
    });
  } catch {
    // Resovle local fail
  }

  try {
    return require.resolve(join(yarn.packages, importName));
  } catch {
    // Resolve global yarn fail
  }

  try {
    return require.resolve(join(npm.packages, importName));
  } catch {
    // Resolve global npm fail
  }

  if (ensure) throw new Error(`Failed to resolve package "${importName}"`);

  return undefined;
}

export function resolveCPanyPlugin(
  name: string
): { name: string; directory: string } | undefined {
  for (const plugin of [
    name,
    `@cpany/${name}`,
    `@cpany/plugin-${name}`,
    `cpany-plugin-${name}`
  ]) {
    const resolved = resolveImportPath(`${plugin}/package.json`);
    if (resolved) {
      return { name, directory: dirname(resolved) };
    }
  }
  return undefined;
}
