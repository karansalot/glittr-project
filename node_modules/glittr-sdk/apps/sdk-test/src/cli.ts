import { initEccLib, networks, payments, Psbt, script } from "bitcoinjs-lib";
import ECPairFactory, { ECPairInterface } from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";
import { OpReturnMessage, TransactionBuilder, Utxo } from "@glittr-sdk/sdk";
import * as readline from "readline";

initEccLib(ecc);

const ELECTRUM_API = "http://192.145.44.30:3000";
const GLITTR_API = "http://192.145.44.30:3001";

function encodeGlittrData(message: string): Buffer {
  const glittrFlag = Buffer.from("GLITTR", "utf8");
  const glittrData = Buffer.from(message, "utf8");
  const embed = script.compile([106, glittrFlag, glittrData]);
  return embed;
}

async function getUtxo(address: string): Promise<Utxo> {
  const utxosFetch = await fetch(`${ELECTRUM_API}/address/${address}/utxo`);
  const utxos = (await utxosFetch.json()) ?? [];
  const confirmedUtxos = utxos.filter(
    (tx: any) => tx?.status && tx?.status?.confirmed && tx.value > 1000
  );
  const utxo = confirmedUtxos[0];
  if (!utxo) {
    console.error(`Error: No UTXO`);
    process.exit(1);
  }
  return utxo;
}

async function getTxHex(txId: string): Promise<string> {
  const txHexFetch = await fetch(`${ELECTRUM_API}/tx/${txId}/hex`);
  const txHex = await txHexFetch.text();
  if (!txHex) {
    console.error(`Error: No TX Hex`);
    process.exit(1);
  }
  return txHex;
}

function generatePsbtHex(
  keypair: ECPairInterface,
  address: string,
  embed: Buffer,
  utxo: Utxo,
  txHex: string,
  validator: (pubkey: any, msghash: any, signature: any) => boolean
): string {
  const psbt = new Psbt({ network: networks.regtest })
    .addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(txHex, "hex"),
    })
    .addOutput({
      script: embed,
      value: 0,
    })
    .addOutput({ address, value: utxo.value - 1000 })
    .signInput(0, keypair);

  const isValid = psbt.validateSignaturesOfInput(0, validator);
  if (!isValid) {
    console.error(`Signature Invalid`);
    process.exit(1);
  }

  psbt.finalizeAllInputs();
  const hex = psbt.extractTransaction(true).toHex();
  return hex;
}

async function contractCreation(
  keypair: ECPairInterface,
  validator: any,
  supplyCap: number,
  amountPerMint: number,
  divisibility: number,
  liveTime: number
) {
  const payment = payments["p2pkh"]({
    pubkey: keypair.publicKey,
    network: networks.regtest,
  });

  const t = TransactionBuilder.freeMintContractInstantiate({
    supplyCap,
    amountPerMint,
    divisibilty: divisibility,
    liveTime,
  });
  const embed = encodeGlittrData(JSON.stringify(t));
  const utxo = await getUtxo(payment.address!);
  const txHex = await getTxHex(utxo.txid);
  const hex = generatePsbtHex(
    keypair,
    payment.address!,
    embed,
    utxo,
    txHex,
    validator
  );

  await broadcastTransaction(hex, "Contract Creation");
}

async function mint(
  keypair: ECPairInterface,
  validator: any,
  contractId: string,
  pointer: number
) {
  const payment = payments["p2pkh"]({
    pubkey: keypair.publicKey,
    network: networks.regtest,
  });

  const [block, tx] = contractId.split(":");
  const m = TransactionBuilder.mint({
    contractId: [parseInt(block!), parseInt(tx!)],
    pointer,
  });

  const embedMint = encodeGlittrData(JSON.stringify(m));
  const utxoMint = await getUtxo(payment.address!);
  const txHexMint = await getTxHex(utxoMint.txid);
  const hexMint = generatePsbtHex(
    keypair,
    payment.address!,
    embedMint,
    utxoMint,
    txHexMint,
    validator
  );

  await broadcastTransaction(hexMint, "Mint");
}

async function broadcastTransaction(hex: string, operation: string) {
  const validateFetch = await fetch(`${GLITTR_API}/validate-tx`, {
    method: "POST",
    headers: { "Content-Type": " text-plain" },
    body: hex,
  });
  if (!validateFetch.ok) {
    console.error(`Fetch validate tx error ${validateFetch.statusText} `);
  }
  const validateTx = await validateFetch.json();
  if (!validateTx?.is_valid) {
    console.error(`Error : ${validateTx?.msg ?? "Tx invalid"}`);
    process.exit(1);
  }

  const txIdFetch = await fetch(`${ELECTRUM_API}/tx`, {
    method: "POST",
    headers: { "Content-Type": "text-plain" },
    body: hex,
  });
  if (!txIdFetch.ok) {
    console.error(`Error : Broadcasting transaction ${txIdFetch.statusText}`);
    process.exit(1);
  }
  const txId = await txIdFetch.text();
  console.log(`✅ ${operation} Transaction Broadcasted Successfully : ${txId}`);

  const { default: ora } = await import("ora");
  const spinner = ora("Waiting for Glittr indexer . . .").start();

  let txData;
  let found = false;

  while (!found) {
    try {
      const tx = await fetch(`${GLITTR_API}/tx/${txId}`, {
        method: "GET",
      });

      if (tx.status === 404) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        txData = await tx.json();
        spinner.succeed("Transaction found!");
        console.log("Transaction found:", txData);
        found = true;
      }
    } catch (error) {
      spinner.fail("Error fetching transaction.");
      console.error("Error fetching transaction:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      spinner.start("Waiting for Glittr indexer . . .");
    }
  }
  if (!txData) {
    console.error(`Error : Transaction data not found`);
    process.exit(1);
  }
}

async function getUserInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const ecpair = ECPairFactory(ecc);
  const kp = ecpair.fromWIF(
    "cW84FgWG9U1MpKvdzZMv4JZKLSU7iFAzMmXjkGvGUvh5WvhrEASj",
    networks.regtest
  );
  const validator = (pubkey: any, msghash: any, signature: any): boolean =>
    ecpair.fromPublicKey(pubkey).verify(msghash, signature);

  const operation = await getUserInput(
    "Choose an operation (1: Contract Creation, 2: Mint): "
  );

  if (operation === "1") {
    const supplyCap = parseInt(await getUserInput("Enter Supply Cap: "));
    const amountPerMint = parseInt(
      await getUserInput("Enter Amount Per Mint: ")
    );
    const divisibility = parseInt(await getUserInput("Enter Divisibility: "));
    const liveTime = parseInt(await getUserInput("Enter Live Time: "));

    await contractCreation(
      kp,
      validator,
      supplyCap,
      amountPerMint,
      divisibility,
      liveTime
    );
  } else if (operation === "2") {
    const contractId = await getUserInput(
      "Enter Contract ID (format: 87081:1): "
    );
    const pointer = parseInt(await getUserInput("Enter Pointer: "));

    await mint(kp, validator, contractId, pointer);
  } else {
    console.log("Invalid choice.");
  }
}

main();
