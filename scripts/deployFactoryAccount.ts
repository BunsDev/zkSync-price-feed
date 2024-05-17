// import { utils, Wallet, Provider } from "zksync-web3";
import * as ethers from "ethers";
import { Web3Provider, Wallet, utils, ContractFactory } from 'zksync-web3';
import { AtlasEnvironment } from "atlas-ide";

import AAFactoryArtifact from "../artifacts/AAFactory";
import AccountArtifact from "../artifacts/Account";

export async function main (atlas: AtlasEnvironment) {
  // @ts-ignore target zkSyncTestnet in config file which can be testnet or local
  const provider = new Web3Provider(atlas.provider);
  const wallet = provider.getSigner();

  const factory = new ContractFactory(
      AAFactoryArtifact.AAFactory.abi,
      AAFactoryArtifact.AAFactory.evm.bytecode.object,
      wallet,
      "create"
  );
  
  const additionalFactoryDeps = [`0x${AccountArtifact.Account.evm.bytecode.object}`]

  const additionalDeps = additionalFactoryDeps
            ? additionalFactoryDeps.map((val) => ethers.utils.hexlify(val))
            : [];
  const factoryDeps = [...additionalDeps];

  const aaFactory = await factory.deploy(
      ...[utils.hashBytecode(`0x${AccountArtifact.Account.evm.bytecode.object}`)],
      {
        customData: {
          factoryDeps,
        },
      }
  );

  console.log("Factory deploying...");
  await aaFactory.deployed();
  const receipt = await aaFactory.deployTransaction.wait();

  console.log(`AA factory address: ${receipt.contractAddress}`);

  const owner = Wallet.createRandom();
  console.log("SC Account owner pk: ", owner.privateKey);

  const salt = ethers.constants.HashZero;
  const tx = await aaFactory.deployAccount(salt, owner.address);
  console.log("Deploying new account...");
  await tx.wait();
  const abiCoder = new ethers.utils.AbiCoder();
  const accountAddress = utils.create2Address(
    receipt.contractAddress,
    await aaFactory.aaBytecodeHash(),
    salt,
    abiCoder.encode(["address"], [owner.address])
  );

  console.log(`SC Account deployed on address ${accountAddress}`);

  console.log("Funding smart contract account with some ETH...");
  await (
    await wallet.sendTransaction({
      to: accountAddress,
      value: ethers.utils.parseEther("0.02"),
    })
  ).wait();
  console.log(`Finished deploying factory account + first sc wallet`);
  return {
    accountAddress, 
    owner,
  }
}
