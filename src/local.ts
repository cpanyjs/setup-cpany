import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { existsSync } from 'fs';
import { join } from 'path';

import { ICPanyConfig } from './types';
import { cmdExists, resolveCPanyPlugin } from './utils';

export async function localInstall(
  root: string,
  config: ICPanyConfig
): Promise<void> {
  core.info('Setup CPany locally');

  await installDep(root);

  core.addPath(join(root, './node_modules/.bin'));

  core.startGroup('CPany Plugins');
  for (const pluginName of config?.plugins ?? []) {
    const resolvedPlugin = resolveCPanyPlugin(pluginName);
    if (resolvedPlugin) {
      core.info(`[${resolvedPlugin.name}] => ${resolvedPlugin.directory}`);
    } else {
      core.setFailed(`[${pluginName}] => Not found`);
    }
  }
  core.endGroup();
}

async function installDep(root: string): Promise<void> {
  if (existsSync(join(root, 'package-lock.json'))) {
    if (!cmdExists('npm')) {
      core.error('npm is not found.');
      process.exit(1);
    }
    await exec('npm', ['install'], { cwd: root });
  } else if (existsSync(join(root, 'pnpm-lock.yaml'))) {
    if (!cmdExists('pnpm')) {
      await exec('npm', ['install', '-g', 'pnpm']);
    }
    await exec('pnpm', ['install'], { cwd: root });
  } else if (existsSync(join(root, 'yarn.lock'))) {
    if (!cmdExists('yarn')) {
      await exec('npm', ['install', '-g', 'yarn']);
    }
    await exec('yarn', ['install'], { cwd: root });
  } else {
    core.error(`No package manager has been detected.`);
    process.exit(1);
  }
}
