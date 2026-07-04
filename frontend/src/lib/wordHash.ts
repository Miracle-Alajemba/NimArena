import { keccak256, encodePacked, toHex } from "viem";

/**
 * Generates a random 32-byte hexadecimal salt.
 */
export function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Fallback for node testing or server-side renders
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return toHex(bytes);
}

/**
 * Hashes a word with a salt using solidity keccak256 packed encoding.
 * Equivalent to keccak256(abi.encodePacked(word, salt)) in Solidity.
 * 
 * @param word The plaintext word.
 * @param salt The 32-byte hex salt.
 */
export function hashWord(word: string, salt: `0x${string}`): `0x${string}` {
  const cleanWord = word.trim().toLowerCase();
  
  // In Solidity, abi.encodePacked("string", "bytes32") encodes the string as bytes directly, 
  // followed by the 32 bytes of the salt.
  return keccak256(
    encodePacked(
      ["string", "bytes32"],
      [cleanWord, salt]
    )
  );
}
