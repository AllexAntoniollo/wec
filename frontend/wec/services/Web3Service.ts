import { ethers } from "ethers";
import erc20Abi from "./abis/erc20.abi.json";
import presaleAbi from "./abis/presale.abi.json";

export const PRESALE_ADDRESS = "0x678e45853A3bE0C2EA60DEad40e0D335C5ffAdB8";
export const TOKEN_ADDRESSES = {
  USDT: "0xee4CBdAB01C9F5B105f384C3aCcEe703eA13A128",
  USDC: "0x24AE32084C305Bf1323e3628716E00514FFF2a9B",
  WECR: "0xf10a3a88D433BcdB568fE4dd483740f5e589165b",
} as const;

export interface WalletBalances {
  usdt: string;
  usdc: string;
  wecr: string;
}

const WECR_UNIT = BigInt(10) ** BigInt(18);
const AMOY_CHAIN_ID = 80002;

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}
let provider: ethers.BrowserProvider | undefined;
let signer: ethers.JsonRpcSigner | undefined;

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No wallet found. Please install MetaMask.");
  }

  provider = new ethers.BrowserProvider(window.ethereum);

  // Solicita permissão ao usuário
  await provider.send("eth_requestAccounts", []);

  signer = await provider.getSigner();
  const address = await signer.getAddress();
  const { chainId } = await provider.getNetwork();

  return { address, chainId: Number(chainId) };
}

async function ensureAmoyNetwork() {
  if (!provider) throw new Error("Connect your wallet first.");
  const { chainId } = await provider.getNetwork();
  if (Number(chainId) !== AMOY_CHAIN_ID) {
    throw new Error("Switch your wallet to the Polygon Amoy network.");
  }
}

async function getAccount(owner?: string) {
  if (owner) return owner;
  if (!signer) throw new Error("Connect your wallet first.");
  return signer.getAddress();
}

/**
 * Retorna o saldo formatado de um token ERC-20.
 * Se `owner` não for informado, usa o endereço conectado.
 */
export async function getBalance(tokenAddress: string, owner?: string) {
  await ensureAmoyNetwork();

  const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
  const account = await getAccount(owner);

  const balance = await token.balanceOf(account);

  return balance;
}

export async function getWalletBalances(owner: string) {
  await ensureAmoyNetwork();
  const tokenAddresses = [
    TOKEN_ADDRESSES.USDT,
    TOKEN_ADDRESSES.USDC,
    TOKEN_ADDRESSES.WECR,
  ];
  const balances = await Promise.all(
    tokenAddresses.map(async (tokenAddress) => {
      const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
      const [balance, decimals] = await Promise.all([
        token.balanceOf(owner) as Promise<bigint>,
        token.decimals() as Promise<bigint>,
      ]);
      return ethers.formatUnits(balance, decimals);
    }),
  );

  return { usdt: balances[0], usdc: balances[1], wecr: balances[2] };
}

export async function getRequiredPaymentAmount(wecrAmount: string) {
  await ensureAmoyNetwork();

  const amountInWecr = ethers.parseUnits(wecrAmount, 18);
  if (amountInWecr <= BigInt(0))
    throw new Error("Enter an amount greater than zero.");

  const presale = new ethers.Contract(PRESALE_ADDRESS, presaleAbi, provider);
  const price = (await presale.price()) as bigint;
  const paymentAmount =
    (amountInWecr * price + WECR_UNIT - BigInt(1)) / WECR_UNIT;
  if (paymentAmount <= BigInt(0)) {
    throw new Error("The entered amount is too low to purchase.");
  }

  return paymentAmount;
}

/**
 * Retorna quanto o `spender` está autorizado a gastar do `owner`.
 */
export async function getAllowance(
  tokenAddress: string,
  spender: string,
  owner?: string,
) {
  await ensureAmoyNetwork();

  const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
  const account = await getAccount(owner);

  const allowance = await token.allowance(account, spender);

  return allowance;
}

export async function parseTokenAmount(tokenAddress: string, amount: string) {
  await ensureAmoyNetwork();

  const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
  const decimals = Number(await token.decimals());

  return ethers.parseUnits(amount, decimals);
}

/**
 * Aprova o `spender` a gastar `amount` do token.
 * `amount` em formato legível (ex: "100.5"). Se omitido, aprova o máximo (uint256).
 */
export async function approve(
  tokenAddress: string,
  spender: string,
  amount: string | bigint,
) {
  if (!signer) throw new Error("Connect your wallet first.");
  await ensureAmoyNetwork();

  const token = new ethers.Contract(tokenAddress, erc20Abi, signer);

  let value: bigint;
  if (typeof amount === "bigint") {
    value = amount;
  } else {
    const decimals = await token.decimals();
    value = ethers.parseUnits(amount, decimals);
  }

  const tx = await token.approve(spender, value);
  const receipt = await tx.wait(); // espera a confirmação

  return { hash: tx.hash, status: receipt.status === 1 ? "success" : "failed" };
}

export async function swap(wecrAmount: string, isUsdt: boolean) {
  if (!signer) throw new Error("Connect your wallet first.");
  await ensureAmoyNetwork();

  const usAmount = await getRequiredPaymentAmount(wecrAmount);
  const presale = new ethers.Contract(PRESALE_ADDRESS, presaleAbi, signer);
  const tx = await presale.swap(usAmount, isUsdt);
  const receipt = await tx.wait();

  return { hash: tx.hash, status: receipt.status === 1 ? "success" : "failed" };
}
export async function freeWithdraw(to: string, amount: string) {
  if (!signer) throw new Error("Connect your wallet first.");
  await ensureAmoyNetwork();

  const presale = new ethers.Contract(PRESALE_ADDRESS, presaleAbi, signer);
  const tx = await presale.freeWithdraw(to, ethers.parseUnits(amount, 18));
  const receipt = await tx.wait();

  return { hash: tx.hash, status: receipt.status === 1 ? "success" : "failed" };
}

export async function isFreeWallet(walletAddress: string) {
  await ensureAmoyNetwork();

  const presale = new ethers.Contract(PRESALE_ADDRESS, presaleAbi, provider);

  const res = await presale.isFreeWallet(walletAddress);

  return res;
}
export async function debtValue(walletAddress: string) {
  await ensureAmoyNetwork();

  const presale = new ethers.Contract(PRESALE_ADDRESS, presaleAbi, provider);

  const res = await presale.debt(walletAddress);

  return res;
}
export async function payDebt(usAmount: string, isUsdt: boolean) {
  if (!signer) throw new Error("Connect your wallet first.");
  await ensureAmoyNetwork();

  const tokenAddress = isUsdt ? TOKEN_ADDRESSES.USDT : TOKEN_ADDRESSES.USDC;
  const amount = await parseTokenAmount(tokenAddress, usAmount);
  const presale = new ethers.Contract(PRESALE_ADDRESS, presaleAbi, signer);
  const tx = await presale.payDebt(amount, isUsdt);
  const receipt = await tx.wait();

  return { hash: tx.hash, status: receipt.status === 1 ? "success" : "failed" };
}
