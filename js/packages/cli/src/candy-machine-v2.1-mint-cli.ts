#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { InvalidArgumentError, program } from 'commander';

import { PublicKey } from '@solana/web3.js';
import {
  CACHE_PATH,
} from './helpers/constants2';

import { verifyTokenMetadata } from './commands/verifyTokenMetadata/verifyTokenMetadata';
import { loadCache } from './helpers/cache2';
import { mintV2 } from './commands/mint2';

import log from 'loglevel';

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}
log.setLevel(log.levels.INFO);

programCommand('mint_one_token')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, cacheName, rpcUrl } = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const candyMachine = new PublicKey(cacheContent.program.candyMachine);
    const tx = await mintV2(keypair, env, candyMachine, rpcUrl);

    log.info('mint_one_token finished', tx);
  });

programCommand('mint_multiple_tokens')
  .requiredOption('-n, --number <string>', 'Number of tokens')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (_, cmd) => {
    const { keypair, env, cacheName, number, rpcUrl } = cmd.opts();

    const NUMBER_OF_NFTS_TO_MINT = parseInt(number, 10);
    const cacheContent = loadCache(cacheName, env);
    const candyMachine = new PublicKey(cacheContent.program.candyMachine);

    log.info(`Minting ${NUMBER_OF_NFTS_TO_MINT} tokens...`);

    const mintToken = async index => {
      const tx = await mintV2(keypair, env, candyMachine, rpcUrl);
      log.info(`transaction ${index + 1} complete`, tx);

      if (index < NUMBER_OF_NFTS_TO_MINT - 1) {
        log.info('minting another token...');
        await mintToken(index + 1);
      }
    };

    await mintToken(0);

    log.info(`minted ${NUMBER_OF_NFTS_TO_MINT} tokens`);
    log.info('mint_multiple_tokens finished');
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
