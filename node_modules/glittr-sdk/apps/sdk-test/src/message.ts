import { OpReturnMessage, TransactionBuilder, Utxo } from "@glittr-sdk/sdk";

async function manualMessage() {
  /**
   * Contract Creation
   */
  const t: OpReturnMessage = {
    tx_type: {
      type: "contract_creation",
      contractType: {
        type: "free_mint",
        asset: {
          amount_per_mint: 10,
          divisibility: 18,
          live_time: 0,
          supply_cap: 2000,
        },
      },
    },
  };
  const tBuild = TransactionBuilder.buildMessage(t);
  console.log(JSON.stringify(tBuild));

  const tA = TransactionBuilder.freeMintContractInstantiate({
    amountPerMint: 10,
    divisibilty: 18,
    liveTime: 0,
    supplyCap: 2000,
  });
  console.log(JSON.stringify(tA));
  console.log(JSON.stringify(tBuild) === JSON.stringify(tA));

  /**
   * Mint
   */
  const ca: OpReturnMessage = {
    tx_type: {
      type: "contract_call",
      contract: [100, 0],
      callType: { mint: { pointer: 0 } },
    },
  };
  const caBuild = TransactionBuilder.buildMessage(ca);
  console.log(JSON.stringify(caBuild));

  const caA = TransactionBuilder.mint({ contractId: [100, 0], pointer: 0 });
  console.log(JSON.stringify(caA));
  console.log(JSON.stringify(caBuild) === JSON.stringify(caA));
}
manualMessage();
