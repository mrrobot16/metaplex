import { BN, Program } from '@project-serum/anchor';
import { PublicKey, Keypair, } from '@solana/web3.js';

export interface WhitelistMintMode {
  neverBurn: undefined | boolean;
  burnEveryTime: undefined | boolean;
}

export interface CandyMachine {
  authority: PublicKey;
  wallet: PublicKey;
  tokenMint: null | PublicKey;
  itemsRedeemed: BN;
  data: CandyMachineData;
}

export interface CandyMachineData {
  itemsAvailable: BN;
  uuid: null | string;
  symbol: string;
  sellerFeeBasisPoints: number;
  isMutable: boolean;
  maxSupply: BN;
  price: BN;
  retainAuthority: boolean;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: PublicKey;
  };
  goLiveDate: null | BN;
  endSettings: null | [number, BN];
  whitelistMintSettings: null | {
    mode: WhitelistMintMode;
    mint: PublicKey;
    presale: boolean;
    discountPrice: null | BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
  creators: {
    address: PublicKey;
    verified: boolean;
    share: number;
  }[];
}

export interface CandyMachineConfig {
  cacheName: string;
  env: 'mainnet-beta' | 'devnet';
  totalNFTs: number;
  retainAuthority: boolean;
  mutable: boolean;
  price: BN;
  treasuryWallet: PublicKey;
  splToken: PublicKey;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: web3.PublicKey;
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
  walletKeyPair: Keypair;
  anchorProgram: Program;
  rateLimit: number;
  rpcUrl: null | string;
}

export interface IPFSCreds {
  projectId: string;
  secretKey: string;
}

/**
 * The Manifest object for a given asset.
 * This object holds the contents of the asset's JSON file.
 * Represented here in its minimal form.
 */
export type Manifest = {
  name: string;
  symbol: string;
  seller_fee_basis_points: number;
  properties: {
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
};

export type WriteIndex = {
  anchorProgram: Program;
  env: any;
  candyMachine: any;
  walletKeyPair: Keypair;
  rateLimit: number;
  collection: any[];
}
