// Auto-generated file - do not edit manually
// Generated from deployments

export type GuessGameAddresses = Record<string, { address: string; chainId: number; chainName?: string }>;

export const GuessGameAddresses: GuessGameAddresses = {
  "11155111": {
    "address": "0x4A303cEd60FdF76C60eFCe92A73De2E7b094883F",
    "chainId": 11155111,
    "chainName": "Sepolia"
  }
};

// Helper to get address by chainId
export function getGuessGameAddress(chainId: number): string | undefined {
  const entry = GuessGameAddresses[chainId.toString()];
  return entry?.address;
}
