import { join } from 'path';
import { existsSync } from 'fs';
import { exec } from '@actions/exec';
import * as core from '@actions/core';
import { lightGreen } from 'kolorist';

import { ICPanyConfig } from './types';
import { cmdExists, resolveCPanyPlugin } from './utils';

export async function localInstall(
  root: string,
  config: ICPanyConfig
): Promise<void> {
  core.info('Setup CPany locally...');

  await core.group('Install dependency', async () => {
    await installDep(root);
    core.addPath(join(root, './node_modules/.bin'));
  });

  for (const pluginName of config?.plugins ?? []) {
    const resolvedPlugin = resolveCPanyPlugin(pluginName, root);
    if (resolvedPlugin) {
      core.info(
        `CPany plugin: ${lightGreen(resolvedPlugin.name)} => ${
          resolvedPlugin.directory
        }`
      );
    } else {
      core.setFailed(`CPany plugin: ${lightGreen(pluginName)} => Not found`);
    }
  }
}

async function installDep(root: string): Promise<void> {
  if (existsSync(join(root, 'package-lock.json'))) {
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
