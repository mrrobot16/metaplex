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
  itemsAvailable: number;
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
  baseUri?: string
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
    baseUri,
  } = config;

  let wallet = new web3.PublicKey(solTreasuryAccount)
  let parsedPrice = price * 10 ** 9;;    
  return {
    storage,
    nftStorageKey,
    ipfsInfuraProjectId,
    number,
    itemsAvailable: number,
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
    baseUri,
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
