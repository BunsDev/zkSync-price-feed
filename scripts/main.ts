import { AtlasEnvironment } from "atlas-ide";
import * as deployFactoryAccount from "./deployFactoryAccount";
import * as setLimit from "./setLimit";
import * as transferEth from "./transferEth";

const RECEIVER_WALLET    = "0x5eE49779dC4bd4CA802660678a8E3F57FB5f4a2b";
const ETH_AMOUNT_FAIL    = "0.00051";
const ETH_AMOUNT_SUCCESS = "0.00049";

export async function main (atlas: AtlasEnvironment) {
    const { owner, accountAddress } = await deployFactoryAccount.main(atlas);
    await setLimit.main(atlas, accountAddress, owner.privateKey);
    try {
        await transferEth.main(atlas, owner.privateKey, accountAddress, RECEIVER_WALLET, ETH_AMOUNT_FAIL);
    } catch (e) {
        console.log("Failed to transfer with", ETH_AMOUNT_FAIL, 'ETH (Good!)');
        console.log("Retrying with proper amount");
    }
    await transferEth.main(atlas, owner.privateKey, accountAddress, RECEIVER_WALLET, ETH_AMOUNT_SUCCESS);
    console.log("Success!");
}
