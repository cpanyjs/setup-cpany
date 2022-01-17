import { join } from 'path';
import { existsSync } from 'fs';
import { exec } from '@actions/exec';
import * as core from '@actions/core';
import { red, lightGreen, underline } from 'kolorist';

import { ICPanyConfig } from './types';
import { cmdExists, packageVersion, resolveCPanyPlugin } from './utils';

function isVerbose(): boolean {
  return core.getInput('verbose') === 'true';
}

export async function localInstall(
  root: string,
  config: ICPanyConfig
): Promise<void> {
  await core.group('Install dependency', async () => {
    await installDep(root);
    core.addPath(join(root, './node_modules/.bin'));
    if (!cmdExists('cpany')) {
      core.setFailed(`@cpany/cli is not installed.`);
      process.exit(1);
    }
  });

  {
    const cli = resolveCPanyPlugin('@cpany/cli', root)!;
    core.info(
      `Cli  : ${lightGreen(`@cpany/cli:${packageVersion(cli.directory)}`)}`
    );
  }

  for (const pluginName of config?.plugins ?? []) {
    const resolvedPlugin = resolveCPanyPlugin(pluginName, root);
    if (resolvedPlugin) {
      const pathLog = isVerbose()
        ? ` => ${underline(resolvedPlugin.directory)}`
        : '';
      core.info(
        `Plugin: ${lightGreen(
          `${resolvedPlugin.name}:${packageVersion(resolvedPlugin.directory)}`
        )}${pathLog}`
      );
    } else {
      core.error(`Plugin: ${lightGreen(pluginName)} => ${red('Not found')}`);
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
    core.setFailed(`No package manager has been detected.`);
    process.exit(1);
  }
}
