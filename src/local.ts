import * as core from '@actions/core';
import { exec } from '@actions/exec';

import { ICPanyConfig } from './types';

export async function localInstall(
  root: string,
  config: ICPanyConfig
): Promise<void> {
  core.info('Setup CPany locally');

  await exec('npm', ['install'], { cwd: root });

  for (const name of config?.plugins ?? []) {
    core.info(name);
  }
}
