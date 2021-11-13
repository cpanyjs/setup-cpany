import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import * as core from '@actions/core';
import { load } from 'js-yaml';

import type { ICPanyConfig } from './types';
import { localInstall } from './local';
import { globalInstall } from './global';

function getRoot(): string {
  const root = core.getInput('root');
  if (root) {
    return join(process.cwd(), root);
  } else {
    return process.cwd();
  }
}

function loadCPanyConfig(root: string): ICPanyConfig {
  const configPath = join(root, 'cpany.yml');
  if (!existsSync(configPath)) {
    core.error(`${configPath} is not found`);
    process.exit(1);
  }
  core.startGroup('cpany.yml');
  const content = readFileSync(configPath, 'utf-8');
  core.info(content);
  core.endGroup();
  try {
    return load(content) as ICPanyConfig;
  } catch (error) {
    core.error(`${error}`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  const root = getRoot();
  core.info(`CPany Root: ${root}`);
  const config = loadCPanyConfig(root);

  if (existsSync(join(root, 'package.json'))) {
    await localInstall(root, config);
  } else {
    await globalInstall(root, config);
  }
}

run();
