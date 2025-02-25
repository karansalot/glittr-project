import { OpReturnMessage } from "./types";

export type TransferParams = {
  asset: string;
  nOutput: number;
  amounts: number[];
};

export type FreeMintContractParams = {
  supplyCap: number;
  amountPerMint: number;
  divisibilty: number;
  liveTime: number;
};

export type MintContractCallParams = {
  contractId: [number, number];
  pointer: number;
};
export class TransactionBuilder {
  constructor() {}

  static tranfer(params: TransferParams) {
    return {
      tx_type: {
        transfer: {
          asset: params.asset,
          n_outputs: params.nOutput,
          amounts: params.amounts,
        },
      },
    };
  }

  static freeMintContractInstantiate(params: FreeMintContractParams) {
    return {
      tx_type: {
        contract_creation: {
          contract_type: {
            asset: {
              free_mint: {
                amount_per_mint: params.amountPerMint,
                divisibility: params.divisibilty,
                live_time: params.liveTime,
                supply_cap: params.supplyCap,
              },
            },
          },
        },
      },
    };
  }

  static mint(params: MintContractCallParams) {
    return {
      tx_type: {
        contract_call: {
          contract: params.contractId,
          call_type: {
            mint: {
              pointer: params.pointer,
            },
          },
        },
      },
    };
  }

  // static createPurchaseBurnSwapContract() {} // TODO

  // static createPreAllocatedContract() {} // TODO

  static buildMessage(m: OpReturnMessage) {
    const { tx_type } = m;

    switch (tx_type.type) {
      case "transfer":
        return {
          tx_type: {
            transfer: {
              asset: tx_type.asset,
              n_outputs: tx_type.n_outputs,
              amounts: tx_type.amounts,
            },
          },
        };
      case "contract_creation":
        const contractType = tx_type.contractType.type;
        const contractAsset = tx_type.contractType.asset;
        return {
          tx_type: {
            contract_creation: {
              contract_type: {
                asset: {
                  [contractType]: contractAsset,
                },
              },
            },
          },
        };
      case "contract_call":
        return {
          tx_type: {
            contract_call: {
              contract: tx_type.contract,
              call_type: tx_type.callType,
            },
          },
        };
    }
  }
}

export * from "./utxo";
export * from "./types";
