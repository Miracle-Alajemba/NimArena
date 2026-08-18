// User-Friendly Error Handler for Nimiq Pay & Web3 Operations

export function parseWalletError(error: any): string {
  if (!error) return "An unexpected error occurred.";
  const msg = typeof error === "string" ? error : error.message || JSON.stringify(error);

  if (msg.includes("user rejected") || msg.includes("User rejected") || msg.includes("4001")) {
    return "Connection request cancelled by user.";
  }
  if (msg.includes("Device ID timeout") || msg.includes("SDK init timeout")) {
    return "Running in standalone preview mode. Mock identity initialized.";
  }
  if (msg.includes("insufficient funds") || msg.includes("exceeds balance")) {
    return "Insufficient balance to complete fee payment.";
  }
  if (msg.includes("ChainId") || msg.includes("network")) {
    return "Please switch your wallet network to Base Sepolia (Chain ID 84532).";
  }
  if (msg.includes("window.ethereum")) {
    return "No Web3 provider found. Please open inside Nimiq Pay or install MetaMask.";
  }

  return msg.length > 80 ? `${msg.slice(0, 80)}...` : msg;
}
