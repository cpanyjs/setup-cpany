import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

import * as core from '@actions/core';
import { exec, getExecOutput } from '@actions/exec';
import { npm, yarn } from 'global-dirs';

import type { ICPanyConfig, IResolvedPlugin } from './types';
import { packageExists } from './utils';

let GlobalNodemodules = npm.packages;

export async function globalInstall(
  root: string,
  config: ICPanyConfig
): Promise<void> {
  core.info('Setup CPany globally');

  GlobalNodemodules = (await getExecOutput('npm root -g')).stdout;

  await exec('npm', ['install', '-g', '@cpany/cli']);

  core.startGroup('CPany Plugins');
  for (const pluginName of config?.plugins ?? []) {
    const resolvedPlugin = await installPlugin(pluginName);
    if (resolvedPlugin) {
      core.info(`[${resolvedPlugin.name}] => ${resolvedPlugin.directory}`);
    } else {
      core.setFailed(`[${pluginName}] => Not found`);
    }
  }
  core.endGroup();

  {
    await exec('npm ll -g --depth=0 --long');
    const rootPath = '/usr/local/lib';
    if (existsSync(rootPath)) {
      core.info(rootPath);
      const dirents = readdirSync(rootPath, { withFileTypes: true });
      for (const dirent of dirents) {
        core.info(dirent.name);
      }
    } else {
      core.info(`Not found => ${rootPath}`);
    }
  }
}

async function installPlugin(
  name: string
): Promise<IResolvedPlugin | undefined> {
  for (const pluginName of [
    name,
    `@cpany/${name}`,
    `@cpany/plugin-${name}`,
    `cpany-plugin-${name}`
  ]) {
    const preResolvedPlugin = resolveGlobal(pluginName);
    if (preResolvedPlugin) {
      return { name: pluginName, directory: preResolvedPlugin };
    } else if (await packageExists(pluginName)) {
      await exec('npm', ['install', '-g', pluginName]);
      const pluginDir = resolveGlobal(pluginName);
      if (pluginDir) {
        return { name: pluginName, directory: pluginDir };
      } else {
        core.error(`${pluginName} installed fail`);
      }
    }
  }
  return undefined;
}

function resolveGlobal(importName: string): string | undefined {
  try {
    return require.resolve(join(GlobalNodemodules, importName));
  } catch {
    // Resolve global node_modules
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

  return undefined;
}
