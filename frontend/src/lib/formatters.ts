import { formatUnits } from "viem";

/**
 * Truncates an Ethereum address to 0x1234...5678
 */
export function truncateAddress(address: string | null | undefined): string {
  if (!address) return "";
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats a raw USDT amount (6 decimals) into a local readable string
 */
export function formatUSDT(amountRaw: bigint | string | number | undefined): string {
  if (amountRaw === undefined || amountRaw === null) return "0.00";
  
  try {
    const rawVal = BigInt(amountRaw.toString());
    const formatted = Number(formatUnits(rawVal, 6));
    return formatted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (error) {
    return "0.00";
  }
}
