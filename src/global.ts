import { dirname, join } from 'path';
import { existsSync, lstatSync } from 'fs';

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
  const rootPath = dirname(GlobalNodemodules);
  if (existsSync(rootPath)) {
    core.info(rootPath);
    core.info(`${lstatSync(rootPath)}`);
  } else {
    core.info(`Not found => ${rootPath}`);
  }

  try {
    const path = dirname(join(GlobalNodemodules, importName));
    if (existsSync(path)) {
      core.info(path);
      core.info(`${lstatSync(path)}`);
    } else {
      core.info(`Not found => ${path}`);
    }
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
