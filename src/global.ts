import * as core from '@actions/core';
import { exec } from '@actions/exec';

import type { ICPanyConfig, IResolvedPlugin } from './types';
import { resolveCPanyPlugin, packageExists } from './utils';

export async function globalInstall(
  root: string,
  config: ICPanyConfig
): Promise<void> {
  core.info('Setup CPany globally');

  await exec('npm root -g');

  await exec('npm', ['install', '-g', '@cpany/cli']);

  core.startGroup('CPany Plugins');
  for (const pluginName of config?.plugins ?? []) {
    const resolvedPlugin = await installPlugin(pluginName, root);
    if (resolvedPlugin) {
      core.info(`[${resolvedPlugin.name}] => ${resolvedPlugin.directory}`);
    } else {
      core.setFailed(`[${pluginName}] => Not found`);
    }
  }
  core.endGroup();
}

async function installPlugin(
  name: string,
  root: string
): Promise<IResolvedPlugin | undefined> {
  for (const pluginName of [
    name,
    `@cpany/${name}`,
    `@cpany/plugin-${name}`,
    `cpany-plugin-${name}`
  ]) {
    const preResolvedPlugin = resolveCPanyPlugin(pluginName, root);
    if (preResolvedPlugin) {
      return preResolvedPlugin;
    } else if (await packageExists(pluginName)) {
      await exec('npm', ['install', '-g', pluginName]);
      const resolvedPlugin = resolveCPanyPlugin(pluginName, root);
      if (resolvedPlugin) {
        return resolvedPlugin;
      } else {
        core.error(`${pluginName} installed fail`);
      }
    }
  }
  return undefined;
}
