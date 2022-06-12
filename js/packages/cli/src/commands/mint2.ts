import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getCandyMachineCreator,
  getCollectionPDA,
  getMasterEdition,
  getMetadata,
  getTokenWallet,
  loadCandyProgramV2,
  loadWalletKey,
} from '../helpers/accounts2';

import { CandyMachine } from '../types2';

import {
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '../helpers/constants';
import * as anchor from '@project-serum/anchor';
import { MintLayout, Token } from '@solana/spl-token';
import { createAssociatedTokenAccountInstruction } from '../helpers/instructions2';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions2';
import log from 'loglevel';

export async function mintV2(
  keypair: string,
  env: string,
  candyMachineAddress: PublicKey,
  rpcUrl: string,
): Promise<string> {
  const mint = Keypair.generate();

  const userKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgramV2(userKeyPair, env, rpcUrl);
  const userTokenAccountAddress = await getTokenWallet(
    userKeyPair.publicKey,
    mint.publicKey,
  );

  const candyMachine: CandyMachine =
    await anchorProgram.account.candyMachine.fetch(candyMachineAddress);

  const remainingAccounts = [];
  const signers = [mint, userKeyPair];
  const cleanupInstructions = [];
  const instructions = [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: userKeyPair.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MintLayout.span,
      lamports:
        await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
          MintLayout.span,
        ),
      programId: TOKEN_PROGRAM_ID,
    }),
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      0,
      userKeyPair.publicKey,
      userKeyPair.publicKey,
    ),
    createAssociatedTokenAccountInstruction(
      userTokenAccountAddress,
      userKeyPair.publicKey,
      userKeyPair.publicKey,
      mint.publicKey,
    ),
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      userTokenAccountAddress,
      userKeyPair.publicKey,
      [],
      1,
    ),
  ];

  const metadataAddress = await getMetadata(mint.publicKey);
  const masterEdition = await getMasterEdition(mint.publicKey);

  log.debug(
    'Remaining accounts: ',
    remainingAccounts.map(i => i.pubkey.toBase58()),
  );
  const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
    candyMachineAddress,
  );
  instructions.push(
    await anchorProgram.instruction.mintNft(creatorBump, {
      accounts: {
        candyMachine: candyMachineAddress,
        candyMachineCreator,
        payer: userKeyPair.publicKey,
        //@ts-ignore
        wallet: candyMachine.wallet,
        mint: mint.publicKey,
        metadata: metadataAddress,
        masterEdition,
        mintAuthority: userKeyPair.publicKey,
        updateAuthority: userKeyPair.publicKey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        recentBlockhashes: anchor.web3.SYSVAR_SLOT_HASHES_PUBKEY,
        instructionSysvarAccount: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
    }),
  );

  const collectionPDA = (await getCollectionPDA(candyMachineAddress))[0];
  const collectionPDAAccount =
    await anchorProgram.provider.connection.getAccountInfo(collectionPDA);

  const data = candyMachine.data;
  const txnEstimate =
    892 +
    (collectionPDAAccount && data.retainAuthority ? 182 : 0) +
    (candyMachine.tokenMint ? 177 : 0) +
    (data.whitelistMintSettings ? 33 : 0) +
    (data.whitelistMintSettings?.mode?.burnEveryTime ? 145 : 0) +
    (data.gatekeeper ? 33 : 0) +
    (data.gatekeeper?.expireOnUse ? 66 : 0);

  log.info('Transaction size estimate: ', txnEstimate);
  const INIT_INSTRUCTIONS_LENGTH = 4;
  const INIT_SIGNERS_LENGTH = 1;
  let initInstructions: anchor.web3.TransactionInstruction[] = [];
  let initSigners: Keypair[] = [];


  const mainInstructions = (
    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      userKeyPair,
      instructions,
      signers,
    )
  ).txid;


  return mainInstructions;
}
