import {
  utils,
  Wallet,
  Provider,
  Contract,
  EIP712Signer,
  types,
} from "zksync-web3";
import * as ethers from "ethers";
import { AtlasEnvironment } from "atlas-ide";

import AccountArtifact from "../artifacts/Account";

const ETH_ADDRESS = "0x000000000000000000000000000000000000800A";

export async function main (
  atlas: AtlasEnvironment,
  owner_pk: string,
  account_address: string,
  receiver: string,
  transferAmount: string,
  ) {
  // @ts-ignore target zkSyncTestnet in config file which can be testnet or local
  const provider = new Provider('https://testnet.era.zksync.dev');

  const owner = new Wallet(owner_pk, provider);

  let ethTransferTx = {
    from: account_address,
    to: receiver,
    chainId: (await provider.getNetwork()).chainId,
    nonce: await provider.getTransactionCount(account_address),
    type: 113,
    customData: {
      ergsPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
    } as types.Eip712Meta,
    
    value: ethers.utils.parseEther(transferAmount), 
    gasPrice: await provider.getGasPrice(),
    gasLimit: ethers.BigNumber.from(20000000), // constant 20M since estimateGas() causes an error and this tx consumes more than 15M at most
    data: "0x",
  };
  const signedTxHash = EIP712Signer.getSignedDigest(ethTransferTx);
  const signature = ethers.utils.arrayify(
    ethers.utils.joinSignature(owner._signingKey().signDigest(signedTxHash))
  );

  ethTransferTx.customData = {
    ...ethTransferTx.customData,
    customSignature: signature,
  };

  // read account limits
  const account = new Contract(account_address, AccountArtifact.Account.abi, owner);
  const limitData = await account.limits(ETH_ADDRESS);

  // console.log("Account ETH limit is: ", limitData.limit.toString());
  // console.log("Available today: ", limitData.available.toString());

  // L1 timestamp tends to be undefined in latest blocks. So it should find the latest L1 Batch first.
  let l1BatchRange = await provider.getL1BatchBlockRange(
    await provider.getL1BatchNumber()
  );
  let l1TimeStamp = (await provider.getBlock(l1BatchRange[1])).l1BatchTimestamp;

  console.log(
    "Limit will reset on timestamp: ",
    limitData.resetTime.toString()
  );

  // actually do the ETH transfer
  console.log("Sending ETH transfer from smart contract account");
  const sentTx = await provider.sendTransaction(utils.serialize(ethTransferTx));
  await sentTx.wait();
  // console.log(`ETH transfer tx hash is ${sentTx.hash}`);

  console.log("Transfer completed and limits updated!");

  const newLimitData = await account.limits(ETH_ADDRESS);
  // console.log("New account limit: ", newLimitData.limit.toString());
  console.log("Available today: ", newLimitData.available.toString());
  /*
  console.log(
    "Limit will reset on timestamp:",
    newLimitData.resetTime.toString()
  );
  */

  if (newLimitData.resetTime.toString() == limitData.resetTime.toString()) {
    console.log("Reset time was not updated as not enough time has passed");
  }else {
    console.log("Limit timestamp was reset");
  }
  return;
}

