import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import fs from 'fs';
import { BN, Program, web3 } from '@project-serum/anchor';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getAtaForMint } from './accounts';
import { CLUSTERS, DEFAULT_CLUSTER } from './constants';
import { Metadata, MetadataKey } from '@metaplex-foundation/mpl-token-metadata';

export enum StorageType {
  ArweaveBundle = 'arweave-bundle',
  ArweaveSol = 'arweave-sol',
  Arweave = 'arweave',
  Ipfs = 'ipfs',
  Aws = 'aws',
  NftStorage = 'nft-storage',
  Pinata = 'pinata',
}

export async function getCandyMachineV2Config(
  walletKeyPair: web3.Keypair,
  anchorProgram: Program,
  configPath: any,
): Promise<{
  storage: StorageType;
  nftStorageKey: string;
  ipfsInfuraProjectId: string;
  number: number;
  ipfsInfuraSecret: string;
  pinataJwt: string;
  pinataGateway: string;
  awsS3Bucket: string;
  retainAuthority: boolean;
  mutable: boolean;
  batchSize: number;
  price: BN;
  treasuryWallet: web3.PublicKey;
  splToken: web3.PublicKey | null;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: web3.PublicKey;
  };
  endSettings: null | [number, BN];
  whitelistMintSettings: null | {
    mode: any;
    mint: web3.PublicKey;
    presale: boolean;
    discountPrice: null | BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
  goLiveDate: BN | null;
  uuid: string;
  arweaveJwk: string;
}> {
  if (configPath === undefined) {
    throw new Error('The configPath is undefined');
  }
  const configString = fs.readFileSync(configPath);

  //@ts-ignore
  const config = JSON.parse(configString);

  const {
    storage,
    nftStorageKey,
    ipfsInfuraProjectId,
    number,
    ipfsInfuraSecret,
    pinataJwt,
    pinataGateway,
    awsS3Bucket,
    noRetainAuthority,
    noMutable,
    batchSize,
    price,
    splToken,
    splTokenAccount,
    solTreasuryAccount,
    gatekeeper,
    endSettings,
    hiddenSettings,
    whitelistMintSettings,
    goLiveDate,
    uuid,
    arweaveJwk,
  } = config;
  // console.log('config', config);
  let wallet;
  let parsedPrice = price;
  // console.log('splTokenAccount', splTokenAccount)
  const splTokenAccountFigured = splTokenAccount
    ? splTokenAccount
    : splToken
    ? (
        await getAtaForMint(
          new web3.PublicKey(splToken),
          walletKeyPair.publicKey,
        )
      )[0]
    : null;
  // console.log('splTokenAccountFigured', splTokenAccountFigured)
  // console.log('splToken', splToken)
  if (splToken) {
    if (solTreasuryAccount) {
      throw new Error(
        'If spl-token-account or spl-token is set then sol-treasury-account cannot be set',
      );
    }
    if (!splToken) {
      throw new Error(
        'If spl-token-account is set, spl-token must also be set',
      );
    }
    const splTokenKey = new web3.PublicKey(splToken);
    const splTokenAccountKey = new web3.PublicKey(splTokenAccountFigured);
    // console.log('splTokenAccountKey', splTokenAccountKey)
    if (!splTokenAccountFigured) {
      throw new Error(
        'If spl-token is set, spl-token-account must also be set',
      );
    }

    const token = new Token(
      anchorProgram.provider.connection,
      splTokenKey,
      TOKEN_PROGRAM_ID,
      walletKeyPair,
    );

    const mintInfo = await token.getMintInfo();
    if (!mintInfo.isInitialized) {
      throw new Error(`The specified spl-token is not initialized`);
    }
    const tokenAccount = await token.getAccountInfo(splTokenAccountKey);
    // console.log('tokenAccount', tokenAccount);
    if (!tokenAccount.isInitialized) {
      throw new Error(`The specified spl-token-account is not initialized`);
    }
    if (!tokenAccount.mint.equals(splTokenKey)) {
      throw new Error(
        `The spl-token-account's mint (${tokenAccount.mint.toString()}) does not match specified spl-token ${splTokenKey.toString()}`,
      );
    }

    wallet = new web3.PublicKey(splTokenAccountKey);
    parsedPrice = price * 10 ** mintInfo.decimals;
    if (
      whitelistMintSettings?.discountPrice ||
      whitelistMintSettings?.discountPrice === 0
    ) {
      whitelistMintSettings.discountPrice *= 10 ** mintInfo.decimals;
    }
  } else {
    parsedPrice = price * 10 ** 9;
    if (
      whitelistMintSettings?.discountPrice ||
      whitelistMintSettings?.discountPrice === 0
    ) {
      whitelistMintSettings.discountPrice *= 10 ** 9;
    }
    wallet = solTreasuryAccount
      ? new web3.PublicKey(solTreasuryAccount)
      : walletKeyPair.publicKey;
  }

  if (whitelistMintSettings) {
    whitelistMintSettings.mint = new web3.PublicKey(whitelistMintSettings.mint);
    if (
      whitelistMintSettings?.discountPrice ||
      whitelistMintSettings?.discountPrice === 0
    ) {
      whitelistMintSettings.discountPrice = new BN(
        whitelistMintSettings.discountPrice,
      );
    }
  }

  if (endSettings) {
    if (endSettings.endSettingType.date) {
      endSettings.number = new BN(parseDate(endSettings.value));
    } else if (endSettings.endSettingType.amount) {
      endSettings.number = new BN(endSettings.value);
    }
    delete endSettings.value;
  }

  if (hiddenSettings) {
    const utf8Encode = new TextEncoder();
    hiddenSettings.hash = utf8Encode.encode(hiddenSettings.hash);
  }

  if (gatekeeper) {
    gatekeeper.gatekeeperNetwork = new web3.PublicKey(
      gatekeeper.gatekeeperNetwork,
    );
  }

  return {
    storage,
    nftStorageKey,
    ipfsInfuraProjectId,
    number,
    ipfsInfuraSecret,
    pinataJwt,
    pinataGateway: pinataGateway ? pinataGateway : null,
    awsS3Bucket,
    retainAuthority: !noRetainAuthority,
    mutable: !noMutable,
    batchSize,
    price: new BN(parsedPrice),
    treasuryWallet: wallet,
    splToken: splToken ? new web3.PublicKey(splToken) : null,
    gatekeeper,
    endSettings,
    hiddenSettings,
    whitelistMintSettings,
    goLiveDate: goLiveDate ? new BN(parseDate(goLiveDate)) : null,
    uuid,
    arweaveJwk,
  };
}

export const getUnixTs = () => {
  return new Date().getTime() / 1000;
};

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getCluster(name: string): string {
  for (const cluster of CLUSTERS) {
    if (cluster.name === name) {
      return cluster.url;
    }
  }
  return DEFAULT_CLUSTER.url;
}

export async function parseCollectionMintPubkey(
  collectionMint: null | PublicKey,
  connection: Connection,
  walletKeypair: Keypair,
) {
  let collectionMintPubkey: null | PublicKey = null;
  if (collectionMint) {
    try {
      collectionMintPubkey = new PublicKey(collectionMint);
    } catch (error) {
      throw new Error(
        'Invalid Pubkey option. Please enter it as a base58 mint id',
      );
    }
    const token = new Token(
      connection,
      collectionMintPubkey,
      TOKEN_PROGRAM_ID,
      walletKeypair,
    );
    await token.getMintInfo();
  }
  if (collectionMintPubkey) {
    const metadata = await Metadata.findByMint(
      connection,
      collectionMintPubkey,
    ).catch();
    if (metadata.data.updateAuthority !== walletKeypair.publicKey.toString()) {
      throw new Error(
        'Invalid collection mint option. Metadata update authority does not match provided wallet keypair',
      );
    }
    const edition = await Metadata.getEdition(connection, collectionMintPubkey);
    if (
      edition.data.key !== MetadataKey.MasterEditionV1 &&
      edition.data.key !== MetadataKey.MasterEditionV2
    ) {
      throw new Error(
        'Invalid collection mint. Provided collection mint does not have a master edition associated with it.',
      );
    }
  }
  return collectionMintPubkey;
}

export function parseDate(date) {
  if (date === 'now') {
    return Date.now() / 1000;
  }
  return Date.parse(date) / 1000;
}

// export const getAtaForMint = async (
//   mint: anchor.web3.PublicKey,
//   buyer: anchor.web3.PublicKey,
// ): Promise<[anchor.web3.PublicKey, number]> => {
//   return await anchor.web3.PublicKey.findProgramAddress(
//     [buyer.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
//     SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
//   );
// };
