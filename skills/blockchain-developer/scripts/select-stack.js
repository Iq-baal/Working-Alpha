#!/usr/bin/env node

const [chainArg, workArg = "fullstack"] = process.argv.slice(2);

if (!chainArg) {
  console.error("Usage: node scripts/select-stack.js <chain> [worktype]");
  process.exit(1);
}

const chain = chainArg.toLowerCase();
const work = workArg.toLowerCase();

const recommendations = {
  evm: {
    contract: ["Foundry", "OpenZeppelin", "Solidity"],
    frontend: ["viem", "wagmi", "wallet standard"],
    backend: ["viem", "network config module", "event indexer"],
    fullstack: ["Foundry", "viem", "wagmi", "OpenZeppelin"],
  },
  ethereum: {
    contract: ["Foundry", "OpenZeppelin", "Solidity"],
    frontend: ["viem", "wagmi", "wallet standard"],
    backend: ["viem", "network config module", "event indexer"],
    fullstack: ["Foundry", "viem", "wagmi", "OpenZeppelin"],
  },
  base: {
    contract: ["Foundry", "OpenZeppelin", "Solidity"],
    frontend: ["viem", "wagmi", "wallet standard"],
    backend: ["viem", "network config module", "event indexer"],
    fullstack: ["Foundry", "viem", "wagmi", "OpenZeppelin"],
  },
  polygon: {
    contract: ["Foundry", "OpenZeppelin", "Solidity"],
    frontend: ["viem", "wagmi", "wallet standard"],
    backend: ["viem", "network config module", "event indexer"],
    fullstack: ["Foundry", "viem", "wagmi", "OpenZeppelin"],
  },
  arbitrum: {
    contract: ["Foundry", "OpenZeppelin", "Solidity"],
    frontend: ["viem", "wagmi", "wallet standard"],
    backend: ["viem", "network config module", "event indexer"],
    fullstack: ["Foundry", "viem", "wagmi", "OpenZeppelin"],
  },
  solana: {
    contract: ["Anchor", "Rust", "solana-program-test"],
    frontend: ["@solana/web3.js", "wallet adapter", "IDL-aware client"],
    backend: ["@solana/web3.js", "indexer", "transaction simulation"],
    fullstack: ["Anchor", "Rust", "@solana/web3.js", "wallet adapter"],
  },
};

const byChain = recommendations[chain];
if (!byChain) {
  console.error(`Unknown chain '${chain}'. Try evm, ethereum, base, polygon, arbitrum, or solana.`);
  process.exit(1);
}

const stack = byChain[work] || byChain.fullstack;

console.log(`Chain: ${chain}`);
console.log(`Work type: ${work}`);
console.log("Recommended stack:");
for (const item of stack) {
  console.log(`- ${item}`);
}
