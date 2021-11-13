import * as core from '@actions/core';
import { exec } from '@actions/exec';

import { ICPanyConfig } from './types';

export async function globalInstall(
  root: string,
  config: ICPanyConfig
): Promise<void> {
  core.info('Setup CPany globally');

  await exec('npm', ['install', '-g', '@cpany/cli'], { cwd: root });

  for (const name of config?.plugins ?? []) {
    core.info(name);
  }
}
