import { utils, Wallet, Provider, Contract, EIP712Signer, types,
} from "zksync-web3";
import * as ethers from "ethers";

import { AtlasEnvironment } from "atlas-ide";
import AccountArtifact from "../artifacts/Account";

const ETH_ADDRESS = "0x000000000000000000000000000000000000800A";

export async function main (atlas: AtlasEnvironment, account_address: string, owner_pk: string) {
  // @ts-ignore target zkSyncTestnet in config file which can be testnet or local
  const provider = new Provider('https://testnet.era.zksync.dev');

  const owner = new Wallet(owner_pk, provider);

  const account = new Contract(account_address, AccountArtifact.Account.abi, owner);

  let setLimitTx = await account.populateTransaction.setSpendingLimit(
    ETH_ADDRESS,
    ethers.utils.parseEther("0.0005")
  );

  setLimitTx = {
    ...setLimitTx,
    from: account_address,
    chainId: (await provider.getNetwork()).chainId,
    nonce: await provider.getTransactionCount(account_address),
    type: 113,
    customData: {
      gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
    } as types.Eip712Meta,
    value: ethers.BigNumber.from(0),
  };

  setLimitTx.gasPrice = await provider.getGasPrice();
  setLimitTx.gasLimit = await provider.estimateGas(setLimitTx);

  const signedTxHash = EIP712Signer.getSignedDigest(setLimitTx);

  const signature = ethers.utils.arrayify(
    ethers.utils.joinSignature(owner._signingKey().signDigest(signedTxHash))
  );

  setLimitTx.customData = {
    ...setLimitTx.customData,
    customSignature: signature,
  };

  console.log("Setting limit for account...");
  const sentTx = await provider.sendTransaction(utils.serialize(setLimitTx));

  await sentTx.wait();

  const limit = await account.limits(ETH_ADDRESS);
//   console.log("Account limit enabled?: ", limit.isEnabled);
  console.log("Account limit: ", limit.limit.toString());
//   console.log("Available limit today: ", limit.available.toString());
//   console.log("Time to reset limit: ", limit.resetTime.toString());
}

