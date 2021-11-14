import os from 'os';
import { join, dirname } from 'path';
import { existsSync, lstatSync } from 'fs';
import { execSync } from 'child_process';

import { getExecOutput } from '@actions/exec';
import * as core from '@actions/core';
import { sync as resolve } from 'resolve';
import { npm, yarn } from 'global-dirs';

import type { IResolvedPlugin } from './types';

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

export async function packageExists(name: string): Promise<boolean> {
  try {
    const { stdout } = await getExecOutput('npm', ['search', name], {
      silent: true
    });
    for (const line of stdout.split('\n')) {
      // TODO: check keywords
      if (line.startsWith(name) && line.includes('CPany')) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function resolveImportPath(
  importName: string,
  root: string,
  ensure: true
): string;
export function resolveImportPath(
  importName: string,
  root: string,
  ensure?: boolean
): string | undefined;
export function resolveImportPath(
  importName: string,
  root: string,
  ensure = false
): string | undefined {
  try {
    return resolve(importName, {
      preserveSymlinks: false,
      basedir: root
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
    const path = dirname(join(npm.packages, importName));
    if (existsSync(path)) {
      core.info(path);
      core.info(`${lstatSync(path)}`);
    } else {
      core.info(`Not found => ${path}`);
    }
    return require.resolve(join(npm.packages, importName));
  } catch {
    // Resolve global npm fail
  }

  if (ensure) throw new Error(`Failed to resolve package "${importName}"`);

  return undefined;
}

export function resolveCPanyPlugin(
  name: string,
  root: string
): IResolvedPlugin | undefined {
  for (const plugin of [
    name,
    `@cpany/${name}`,
    `@cpany/plugin-${name}`,
    `cpany-plugin-${name}`
  ]) {
    const resolved = resolveImportPath(`${plugin}/package.json`, root);
    if (resolved) {
      return { name: plugin, directory: dirname(resolved) };
    }
  }
  return undefined;
}
