import { join } from 'path';

import * as core from '@actions/core';
import { exec, getExecOutput } from '@actions/exec';
import { npm, yarn } from 'global-dirs';
import { lightGreen, underline } from 'kolorist';

import type { ICPanyConfig, IResolvedPlugin } from './types';
import { packageExists } from './utils';

let GlobalNodemodules = npm.packages;

export async function globalInstall(
  root: string,
  config: ICPanyConfig
): Promise<void> {
  core.info('Setup CPany globally...');

  GlobalNodemodules = (
    await getExecOutput('npm', ['root', '-g'], { silent: true })
  ).stdout.trim();
  core.info(`Global node_modules: ${underline(GlobalNodemodules)}`);

  await core.group('Install @cpany/cli globally', async () => {
    await exec('npm', ['install', '-g', '@cpany/cli']);
  });

  const plugins: IResolvedPlugin[] = [];
  for (const pluginName of config?.plugins ?? []) {
    const resolvedPlugin = await installPlugin(pluginName);
    if (resolvedPlugin) {
      plugins.push(resolvedPlugin);
    } else {
      core.setFailed(`CPany plugin: ${lightGreen(pluginName)} => Not found`);
    }
  }

  for (const resolvedPlugin of plugins) {
    core.info(
      `CPany plugin: ${lightGreen(resolvedPlugin.name)} => ${underline(
        resolvedPlugin.directory
      )}`
    );
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
    const preResolvedPlugin = resolveGlobal(`${pluginName}/package.json`);
    if (preResolvedPlugin) {
      return { name: pluginName, directory: preResolvedPlugin };
    } else if (await packageExists(pluginName)) {
      await core.group(`Install ${pluginName} globally`, async () => {
        await exec('npm', ['install', '-g', pluginName]);
      });
      const pluginDir = resolveGlobal(`${pluginName}/package.json`);
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
