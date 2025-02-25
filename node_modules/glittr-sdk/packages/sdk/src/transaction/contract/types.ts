import { BlockHeight, BlockTxTuple, OutPoint } from "../../common";
import { TransferRatioType, TransferScheme } from "../transfer";

interface OracleMessage {
  input_outpoint: OutPoint;
  min_in_value: bigint;
  out_value: bigint;
  asset_id?: string;
}

interface OracleMessageSigned {
  signature: Uint8Array;
  message: OracleMessage;
}

type InputAsset =
  | { type: "raw_btc" }
  | { type: "glittr_asset"; value: BlockTxTuple }
  | { type: "metaprotocol" };

export type AssetContractFreeMint = {
  supply_cap?: number;
  amount_per_mint: number;
  divisibility: number;
  live_time: BlockHeight;
};

export type AssetContractPurchaseBurnSwap = {
  input_asset: InputAsset;
  transfer_scheme: TransferScheme;
  transfer_ratio_type: TransferRatioType;
};

export type ContractType =
  | { type: "preallocated"; asset: {} }
  | { type: "free_mint"; asset: AssetContractFreeMint }
  | { type: "purchase_burn_swap"; asset: AssetContractPurchaseBurnSwap };

export interface MintOption {
  pointer: number;
  oracle_message?: OracleMessageSigned;
}

export type CallType = 
| { mint: MintOption }
| { burn: {} }
| { swap: {} }

// export type CallType =
//   | { type: "mint"; mintOption: MintOption }
//   | { type: "burn" }
//   | { type: "swap" };
