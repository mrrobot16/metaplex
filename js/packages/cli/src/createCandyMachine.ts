import log from 'loglevel';
import { PublicKey, Keypair } from '@solana/web3.js';
import { BN, Program } from '@project-serum/anchor';
import { createCandyMachineV2 } from './helpers/accounts2';
import { IPFSCreds } from './types2';

import { setCollection } from './commands/set-collection2';

const MOCK_CREATOR = {
  address: new PublicKey('J8MBLPKwHKuSscF1x2UmzQyU6c7RFKGnXzEyzkwHPoLu'),
  verified: true,
  share: 100,
};

export async function createCandyMachine({
  price,
  totalNFTs,
  gatekeeper,
  treasuryWallet,
  // splTokenAccount,
  splToken,
  goLiveDate,
  endSettings,
  whitelistMintSettings,
  hiddenSettings,
  // storage,
  // ipfsCredentials,
  // nftStorageKey,
  // awsS3Bucket,
  retainAuthority,
  mutable,

  uuid,
  walletKeyPair,
  anchorProgram,
  // arweaveJwk,
  // rateLimit,
  collectionMintPubkey,
  setCollectionMint,
  // rpcUrl,
  creators,
}: {
  price: BN;
  totalNFTs: number;
  storage: string;
  treasuryWallet: PublicKey;
  splToken: PublicKey;
  splTokenAccount: PublicKey;
  retainAuthority: boolean;
  mutable: boolean;
  ipfsCredentials: IPFSCreds;
  awsS3Bucket: string;
  nftStorageKey: null | string;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: PublicKey;
  };
  goLiveDate: null | BN;
  endSettings: null | [number, BN];
  whitelistMintSettings: null | {
    mode: any;
    mint: PublicKey;
    presale: boolean;
    discountPrice: null | BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
  uuid: string;
  walletKeyPair: Keypair;
  anchorProgram: Program;
  arweaveJwk: string;
  rateLimit: number;
  collectionMintPubkey: null | PublicKey;
  setCollectionMint: boolean;
  rpcUrl: null | string;
  creators?: {
    address: PublicKey;
    verified: boolean;
    share: number;
  }[];
}): Promise<any> {
  creators = [MOCK_CREATOR];
  try {
    if (!creators?.every(creator => creator.address !== undefined)) {
      throw new Error('Creator address is missing');
    }

    // initialize candy
    log.info(`initializing candy machine`);
    const res = await createCandyMachineV2(
      anchorProgram,
      walletKeyPair,
      treasuryWallet,
      splToken,
      {
        itemsAvailable: new BN(totalNFTs),
        uuid,
        symbol: 'EMJ',
        sellerFeeBasisPoints: 123,
        isMutable: mutable,
        maxSupply: new BN(0),
        retainAuthority: retainAuthority,
        gatekeeper,
        goLiveDate,
        price,
        endSettings,
        whitelistMintSettings,
        hiddenSettings,
        creators: creators.map(creator => {
          return {
            address: new PublicKey(creator.address),
            verified: true,
            share: 100,
          };
        }),
      },
    );

    if (!setCollectionMint) {
      const collection = await setCollection(
        walletKeyPair,
        anchorProgram,
        res.candyMachine,
        collectionMintPubkey,
      );
      console.log('Collection: ', collection);
    } else {
      console.log('No collection set');
    }

    log.info(
      `initialized config for a candy machine with publickey: ${res.candyMachine.toBase58()}`,
    );
  } catch (exx) {
    log.error('Error deploying config to Solana network.', exx);
    throw exx;
  }
}

// const sampleConfig = {
//     "price": 1.0,
//     "number": 10,
//     "gatekeeper": null,
//     "solTreasuryAccount": "<YOUR WALLET ADDRESS>",
//     "splTokenAccount": null,
//     "splToken": null,
//     "goLiveDate": "25 Dec 2021 00:00:00 GMT",
//     "endSettings": null,
//     "whitelistMintSettings": null,
//     "hiddenSettings": null,
//     "storage": "arweave-sol",
//     "ipfsInfuraProjectId": null,
//     "ipfsInfuraSecret": null,
//     "nftStorageKey": null,
//     "awsS3Bucket": null,
//     "noRetainAuthority": false,
//     "noMutable": false
// }
