#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { InvalidArgumentError, program } from 'commander';

import {
  getCandyMachineV2Config,
} from './helpers/various2';

import {
  CACHE_PATH,
} from './helpers/constants2';

import {
  loadCandyProgramV2,
  loadWalletKey,
} from './helpers/accounts2';

import { uploadV2 } from './commands/upload3';

import log from 'loglevel';

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}

log.setLevel(log.levels.INFO);

// From commander examples
function myParseInt(value) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  }
  return parsedValue;
}

programCommand('upload')
  .requiredOption(
    '-cp, --config-path <string>',
    'JSON file with candy machine settings',
  )
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .option(
    '-rl, --rate-limit <number>',
    'max number of concurrent requests for the write indices command',
    myParseInt,
    5,
  )
  .action(async (options, cmd) => {

    const {
      keypair,
      env,
      cacheName,
      configPath,
      rpcUrl,
      rateLimit,
    } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);

    const {
      number,
      retainAuthority,
      mutable,
      price,
      splToken,
      treasuryWallet,
      gatekeeper,
      endSettings,
      hiddenSettings,
      whitelistMintSettings,
      goLiveDate,
    } = await getCandyMachineV2Config(walletKeyPair, anchorProgram, configPath);

    const startMs = Date.now();
    log.info('started at: ' + startMs.toString());
    try {
      await uploadV2({
        cacheName,
        env,
        totalNFTs: 0,
        gatekeeper,
        retainAuthority,
        mutable,
        price,
        treasuryWallet,
        anchorProgram,
        walletKeyPair,
        splToken,
        endSettings,
        hiddenSettings,
        whitelistMintSettings,
        goLiveDate,
        rateLimit,
        rpcUrl,
      });
    } catch (err) {
      log.warn('upload was not successful, please re-run.', err);
      process.exit(1);
    }
    const endMs = Date.now();
    const timeTaken = new Date(endMs - startMs).toISOString().substr(11, 8);
    log.info(
      `ended at: ${new Date(endMs).toISOString()}. time taken: ${timeTaken}`,
    );
    process.exit(0);
  });

function programCommand(
  name: string,
  options: { requireWallet: boolean } = { requireWallet: true },
) {
  let cmProgram = program
    .command(name)
    .option(
      '-e, --env <string>',
      'Solana cluster env name',
      'devnet', //mainnet-beta, testnet, devnet
    )
    .option('-l, --log-level <string>', 'log level', setLogLevel)
    .option('-c, --cache-name <string>', 'Cache file name', 'temp');

  if (options.requireWallet) {
    cmProgram = cmProgram.requiredOption(
      '-k, --keypair <path>',
      `Solana wallet location`,
    );
  }

  return cmProgram;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
  if (value === undefined || value === null) {
    return;
  }
  log.info('setting the log value to: ' + value);
  log.setLevel(value);
}

program.parse(process.argv);
