#!/usr/bin/env ts-node
import { InvalidArgumentError, program } from 'commander';

import {
  getCandyMachineV2Config,
  parseCollectionMintPubkey,
} from './helpers/various2';

import { loadCandyProgramV2, loadWalletKey } from './helpers/accounts2';

import { createCandyMachine } from './createCandyMachine';

import log from 'loglevel';

program.version('0.0.2');

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

programCommand('deploy')
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
  .option(
    '-m, --collection-mint <string>',
    'optional collection mint ID. Will be randomly generated if not provided',
  )
  .option(
    '-nc, --no-set-collection-mint',
    'optional flag to prevent the candy machine from using an on chain collection',
  )
  .action(async (options, cmd) => {
    const {
      keypair,
      env,
      configPath,
      rpcUrl,
      rateLimit,
      collectionMint,
      setCollectionMint,
    } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);

    const {
      storage,
      itemsAvailable,
      nftStorageKey,
      ipfsInfuraProjectId,
      ipfsInfuraSecret,
      arweaveJwk,
      awsS3Bucket,
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
      uuid,
    } = await getCandyMachineV2Config(walletKeyPair, anchorProgram, configPath);

    const ipfsCredentials = {
      projectId: ipfsInfuraProjectId,
      secretKey: ipfsInfuraSecret,
    };

    const collectionMintPubkey = await parseCollectionMintPubkey(
      collectionMint,
      anchorProgram.provider.connection,
      walletKeyPair,
    );

    const startMs = Date.now();
    log.info('started at: ' + startMs.toString());
    try {
      await createCandyMachine({
        price,
        totalNFTs: itemsAvailable,
        gatekeeper,
        storage,
        retainAuthority,
        mutable,
        ipfsCredentials,
        awsS3Bucket,
        treasuryWallet,
        anchorProgram,
        walletKeyPair,
        splToken,
        splTokenAccount: null,
        endSettings,
        nftStorageKey,
        hiddenSettings,
        whitelistMintSettings,
        goLiveDate,
        uuid,
        arweaveJwk,
        rateLimit,
        collectionMintPubkey,
        setCollectionMint,
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
