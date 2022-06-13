import log from 'loglevel';
import {
  createCandyMachineV2,
} from '../helpers/accounts2';
import { PublicKey } from '@solana/web3.js';
import { BN, Program, web3 } from '@project-serum/anchor';
import { PromisePool } from '@supercharge/promise-pool';

import { saveCache } from '../helpers/cache2';
import { sleep } from '../helpers/various2';
import { firstAssetManifest } from '../helpers/constants2';
import { CandyMachineConfig, WriteIndex } from '../types2'; 

export async function uploadV2({
  cacheName,
  env,
  retainAuthority,
  mutable,
  price,
  treasuryWallet,
  splToken,
  gatekeeper,
  goLiveDate,
  endSettings,
  whitelistMintSettings,
  hiddenSettings,
  walletKeyPair,
  anchorProgram,
  rateLimit,
  rpcUrl,
  baseUri,
  totalNFTs,
}: CandyMachineConfig): Promise<boolean> {
  let candyMachine = {
    address: null,
    baseUri: null,
    symbol: null,
    itemsAvailable: null
  };
  const cacheContent: any = {
    program: {}
  };  
  
  try {
    if (
      !firstAssetManifest.properties?.creators?.every(
        creator => creator.address !== undefined,
      )
    ) {
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
        uuid: undefined,
        symbol: firstAssetManifest.symbol,
        sellerFeeBasisPoints: firstAssetManifest.seller_fee_basis_points,
        baseUri,
        isMutable: mutable,
        maxSupply: new BN(0),
        retainAuthority,
        gatekeeper,
        goLiveDate,
        price,
        endSettings,
        whitelistMintSettings,
        hiddenSettings,
        creators: firstAssetManifest.properties.creators.map(creator => {
          return {
            address: new PublicKey(creator.address),
            verified: true,
            share: creator.share,
          };
        }),
      },
    );
    cacheContent.program.uuid = res.uuid;
    cacheContent.program.candyMachine = res.candyMachine.toBase58();
    candyMachine.address = res.candyMachine;
    candyMachine.baseUri = res.baseUri;
    candyMachine.symbol = res.symbol;
    candyMachine.itemsAvailable = res.itemsAvailable.toNumber();
    log.info(
      `initialized config for a candy machine with publickey: ${res.candyMachine.toBase58()}`,
    );

    saveCache(cacheName, env, cacheContent);
  } catch (error) {
    log.error('Error deploying config to Solana network.', error);
    throw error;
  }

  // NOTE This logic is to build dummy Names and URI. 
  // the collection variable is gonna come from api request
  let collection = [];
  for(let id = 0; id < candyMachine.itemsAvailable; id++) {
    const item = {
      uri: `${candyMachine.baseUri}/${id+1}`,
      name: `${candyMachine.symbol} #${id+1}`
    }
    collection.push(item);
  }
  console.log('collection', collection);

  return await writeIndices({
    anchorProgram,
    env,
    candyMachine: candyMachine.address,
    walletKeyPair,
    rateLimit,
    collection,
  });
}


/**
 * For each asset present in the Cache object, write to the deployed
 * configuration an additional line with the name of the asset and the link
 * to its manifest, if the asset was not already written according to the
 * value of `onChain` property in the Cache object, for said asset.
 */
async function writeIndices({
  anchorProgram,
  env,
  candyMachine,
  walletKeyPair,
  rateLimit,
  collection
}: WriteIndex) {
  let uploadSuccessful = true;
  
  const poolArray = [{index:'0', configLines: collection}]
  log.info(`Writing all indices in ${poolArray.length} transactions...`);

  const addConfigLines = async ({ index, configLines }) => {    
    const response = await anchorProgram.rpc.addConfigLines(
      index,
      configLines,
      {
        accounts: {
          candyMachine,
          authority: walletKeyPair.publicKey,
        },
        signers: [walletKeyPair],
      },
    );
  };

  await PromisePool.withConcurrency(rateLimit || 5)
    .for(poolArray)
    .handleError(async (error) => {
      log.error(`Failed writing indices error.message: ${error.message}`);
      await sleep(5000);
      uploadSuccessful = false;
    })
    .process(async ({ index, configLines }) => {
      await addConfigLines({ index, configLines });
    });
  return uploadSuccessful;
}