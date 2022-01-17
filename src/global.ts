import { join, dirname } from 'path';

import * as core from '@actions/core';
import * as cache from '@actions/cache';
import { exec, getExecOutput } from '@actions/exec';
import { npm, yarn } from 'global-dirs';
import { red, lightGreen, underline, yellow } from 'kolorist';

import type { ICPanyConfig, IResolvedPlugin } from './types';
import { isVerbose, packageExists, packageVersion } from './utils';

let GlobalNodemodules = npm.packages;

export async function globalInstall(
  _root: string,
  config: ICPanyConfig
): Promise<void> {
  core.info(`Setup ${yellow('Global')} CPany`);

  GlobalNodemodules = (
    await getExecOutput('npm', ['root', '-g'], { silent: true })
  ).stdout.trim();
  core.info(`Global node_modules: ${underline(GlobalNodemodules)}`);

  const paths = ['node_modules', GlobalNodemodules];
  const hitCacheKey = await cache.restoreCache(paths, 'cpany-', ['cpany-']);
  if (hitCacheKey) {
    core.info(`Cache hit: ${lightGreen(hitCacheKey)}`);
  }

  await core.group(`Install ${lightGreen('@cpany/cli')}`, async () => {
    await exec('npm', ['install', '-g', '@cpany/cli']);
  });

  const plugins: IResolvedPlugin[] = [];
  for (const pluginName of config?.plugins ?? []) {
    const resolvedPlugin = await installPlugin(pluginName);
    if (resolvedPlugin) {
      plugins.push(resolvedPlugin);
    } else {
      core.setFailed(
        `CPany plugin ${lightGreen(pluginName)} => ${red('Not found')}`
      );
    }
  }

  const cli = resolveGlobal('@cpany/cli')!;
  const version = packageVersion(dirname(dirname(cli)));
  core.info(`Cli    ${lightGreen(`@cpany/cli:${version}`)}`);

  for (const resolvedPlugin of plugins) {
    const pathLog = isVerbose()
      ? ` => ${underline(resolvedPlugin.directory)}`
      : '';
    core.info(
      `Plugin ${lightGreen(
        `${resolvedPlugin.name}:${packageVersion(
          dirname(resolvedPlugin.directory)
        )}`
      )}${pathLog}`
    );
  }

  if (hitCacheKey !== `cpany-${version}`) {
    await core.group(`Cache CPany v${version}`, async () => {
      await cache.saveCache(paths, `cpany-${version}`);
    });
  }
}

async function installPlugin(
  name: string
): Promise<IResolvedPlugin | undefined> {
  for (const pluginName of [
    name,
    `@cpany/plugin-${name}`,
    `cpany-plugin-${name}`
  ]) {
    const preResolvedPlugin = resolveGlobal(`${pluginName}/package.json`);
    if (preResolvedPlugin) {
      return { name: pluginName, directory: preResolvedPlugin };
    } else if (await packageExists(pluginName)) {
      await core.group(`Install ${lightGreen(pluginName)}`, async () => {
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
