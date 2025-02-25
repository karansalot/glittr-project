type BitcoinAddress = string;
type Ratio = number;

export interface OracleSetting {
  asset_id?: string;
}

export type TransferScheme =
  | { type: "purchase"; address: BitcoinAddress }
  | { type: "burn" };

export type TransferRatioType =
  | { type: "fixed"; ratio: Ratio }
  | { type: "oracle"; pubkey: Uint8Array; setting: OracleSetting };
