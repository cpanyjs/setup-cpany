import { join } from 'path';
import { existsSync } from 'fs';
import { exec } from '@actions/exec';
import * as core from '@actions/core';
import * as cache from '@actions/cache';
import { red, lightGreen, underline } from 'kolorist';

import { ICPanyConfig } from './types';
import {
  cmdExists,
  isVerbose,
  packageVersion,
  resolveCPanyPlugin
} from './utils';

export async function localInstall(
  root: string,
  config: ICPanyConfig
): Promise<void> {
  const paths = ['node_modules'];
  core.startGroup('Restore cache');
  const hitCacheKey = await cache.restoreCache(paths, 'cpany-local-', [
    'cpany-local-'
  ]);
  core.endGroup();

  if (hitCacheKey) {
    core.info(`Cache hit: ${lightGreen(hitCacheKey)}`);
  }

  await core.group('Install dependency', async () => {
    await installDep(root);
  });
  core.addPath(join(root, './node_modules/.bin'));
  if (!cmdExists('cpany')) {
    core.setFailed(`@cpany/cli is not installed.`);
    process.exit(1);
  }

  const cli = resolveCPanyPlugin('@cpany/cli', root)!;
  const version = packageVersion(cli.directory);
  core.info(`Cli    ${lightGreen(`@cpany/cli:${version}`)}`);

  for (const pluginName of config?.plugins ?? []) {
    const resolvedPlugin = resolveCPanyPlugin(pluginName, root);
    if (resolvedPlugin) {
      const pathLog = isVerbose()
        ? ` => ${underline(resolvedPlugin.directory)}`
        : '';
      core.info(
        `Plugin ${lightGreen(
          `${resolvedPlugin.name}:${packageVersion(resolvedPlugin.directory)}`
        )}${pathLog}`
      );
    } else {
      core.error(`Plugin ${lightGreen(pluginName)} => ${red('Not found')}`);
    }
  }

  if (hitCacheKey !== `cpany-local-${version}`) {
    await core.group(`Cache CPany ${lightGreen(`v${version}`)}`, async () => {
      try {
        await cache.saveCache(paths, `cpany-local-${version}`);
      } catch {
        core.info('Cache fail');
      }
    });
  }
}

async function installDep(root: string): Promise<void> {
  if (existsSync(join(root, 'package-lock.json'))) {
    await exec('npm', ['ci'], { cwd: root });
  } else if (existsSync(join(root, 'pnpm-lock.yaml'))) {
    if (!cmdExists('pnpm')) {
      await exec('npm', ['install', '-g', 'pnpm']);
    }
    await exec('pnpm', ['install', '--frozen-lockfile'], { cwd: root });
  } else if (existsSync(join(root, 'yarn.lock'))) {
    if (!cmdExists('yarn')) {
      await exec('npm', ['install', '-g', 'yarn']);
    }
    await exec('yarn', ['install', '--frozen-lockfile'], { cwd: root });
  } else {
    core.setFailed(`No package manager has been detected.`);
    process.exit(1);
  }
}
