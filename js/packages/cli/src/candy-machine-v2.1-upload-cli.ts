#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { InvalidArgumentError, program } from 'commander';

import {
  getCandyMachineV2Config,
  parseCollectionMintPubkey,
} from './helpers/various';

import {
  CACHE_PATH,
  EXTENSION_JSON,
} from './helpers/constants2';

import {
  loadCandyProgramV2,
  loadWalletKey,
} from './helpers/accounts';

import { uploadV2 } from './commands/upload2';

import log from 'loglevel';

import { StorageType } from './helpers/storage-type';
import { getType } from 'mime';

const supportedImageTypes = {
  'image/png': 1,
  'image/gif': 1,
  'image/jpeg': 1,
};
const supportedAnimationTypes = {
  'video/mp4': 1,
  'video/quicktime': 1,
  'audio/mpeg': 1,
  'audio/x-flac': 1,
  'audio/wav': 1,
  'model/gltf-binary': 1,
  'text/html': 1,
};

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
  .argument(
    '<directory>',
    'Directory containing images named from 0-n',
    val => {
      return fs.readdirSync(`${val}`).map(file => path.join(val, file));
    },
  )
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
  .action(async (files: string[], options, cmd) => {

    const {
      keypair,
      env,
      cacheName,
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
      nftStorageKey,
      ipfsInfuraProjectId,
      number,
      ipfsInfuraSecret,
      pinataJwt,
      pinataGateway,
      arweaveJwk,
      awsS3Bucket,
      retainAuthority,
      mutable,
      batchSize,
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

    if (storage === StorageType.ArweaveSol && env !== 'mainnet-beta') {
      log.info(
        '\x1b[31m%s\x1b[0m',
        'WARNING: On Devnet, the arweave-sol storage option only stores your files for 1 week. Please upload via Mainnet Beta for your final collection.\n',
      );
    }

    if (storage === StorageType.ArweaveBundle && env !== 'mainnet-beta') {
      throw new Error(
        'The arweave-bundle storage option only works on mainnet because it requires spending real AR tokens. For devnet, please set the --storage option to "aws" or "ipfs"\n',
      );
    }

    if (storage === StorageType.Arweave) {
      log.warn(
        'WARNING: The "arweave" storage option will be going away soon. Please migrate to arweave-bundle or arweave-sol for mainnet.\n',
      );
    }

    if (storage === StorageType.ArweaveBundle && !arweaveJwk) {
      throw new Error(
        'Path to Arweave JWK wallet file (--arweave-jwk) must be provided when using arweave-bundle',
      );
    }
    if (
      storage === StorageType.Ipfs &&
      (!ipfsInfuraProjectId || !ipfsInfuraSecret)
    ) {
      throw new Error(
        'IPFS selected as storage option but Infura project id or secret key were not provided.',
      );
    }
    if (storage === StorageType.Aws && !awsS3Bucket) {
      throw new Error(
        'aws selected as storage option but existing bucket name (--aws-s3-bucket) not provided.',
      );
    }

    if (!Object.values(StorageType).includes(storage)) {
      throw new Error(
        `Storage option must either be ${Object.values(StorageType).join(
          ', ',
        )}. Got: ${storage}`,
      );
    }
    const ipfsCredentials = {
      projectId: ipfsInfuraProjectId,
      secretKey: ipfsInfuraSecret,
    };

    let imageFileCount = 0;
    let animationFileCount = 0;
    let jsonFileCount = 0;

    // Filter out any non-supported file types and find the JSON vs Image file count
    const supportedFiles = files.filter(it => {
      if (supportedImageTypes[getType(it)]) {
        imageFileCount++;
      } else if (supportedAnimationTypes[getType(it)]) {
        animationFileCount++;
      } else if (it.endsWith(EXTENSION_JSON)) {
        jsonFileCount++;
      } else {
        log.warn(`WARNING: Skipping unsupported file type ${it}`);
        return false;
      }

      return true;
    });

    if (animationFileCount !== 0 && storage === StorageType.Arweave) {
      throw new Error(
        'The "arweave" storage option is incompatible with animation files. Please try again with another storage option using `--storage <option>`.',
      );
    }

    if (animationFileCount !== 0 && animationFileCount !== jsonFileCount) {
      throw new Error(
        `number of animation files (${animationFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    } else if (imageFileCount !== jsonFileCount) {
      throw new Error(
        `number of img files (${imageFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    }

    const elemCount = number ? number : imageFileCount;
    if (elemCount < imageFileCount) {
      throw new Error(
        `max number (${elemCount}) cannot be smaller than the number of images in the source folder (${imageFileCount})`,
      );
    }

    if (animationFileCount === 0) {
      log.info(`Beginning the upload for ${elemCount} (img+json) pairs`);
    } else {
      log.info(
        `Beginning the upload for ${elemCount} (img+animation+json) sets`,
      );
    }

    const collectionMintPubkey = await parseCollectionMintPubkey(
      collectionMint,
      anchorProgram.provider.connection,
      walletKeyPair,
    );

    const startMs = Date.now();
    log.info('started at: ' + startMs.toString());
    try {
      await uploadV2({
        files: supportedFiles,
        cacheName,
        env,
        totalNFTs: elemCount,
        gatekeeper,
        storage,
        retainAuthority,
        mutable,
        nftStorageKey,
        ipfsCredentials,
        pinataJwt,
        pinataGateway,
        awsS3Bucket,
        batchSize,
        price,
        treasuryWallet,
        anchorProgram,
        walletKeyPair,
        splToken,
        endSettings,
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
