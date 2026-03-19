---
name: blockchain-developer
description: Design, implement, test, debug, deploy, and review blockchain applications and smart contracts across EVM chains and Solana. Use when Codex needs to build or audit onchain features, wallets, token logic, DeFi flows, NFT systems, staking, indexing, RPC integrations, transaction flows, contract tests, deployment scripts, or blockchain security checks.
---

# Blockchain Developer

## Overview

Use this skill to deliver blockchain features with a bias for correct chain selection, minimal trust assumptions, strong testing, and explicit security review. Start by identifying the target chain, runtime, wallet model, contract upgradeability needs, and failure modes before writing code.

## Workflow

1. Classify the request.
   - Treat EVM smart contracts, Solidity, Foundry, Hardhat, ethers, viem, ERC standards, and account abstraction as EVM work.
   - Treat Solana programs, Anchor, PDAs, SPL tokens, and transaction simulation as Solana work.
   - Treat bridges, oracles, indexing, cross-chain messaging, and backend transaction orchestration as integration work.
2. Confirm the execution surface.
   - Identify whether the task is onchain logic, offchain backend logic, frontend wallet flow, indexing, or protocol design.
   - Identify the exact network and environment: local, testnet/devnet, staging fork, or mainnet.
3. Choose the minimal stack.
   - Prefer Foundry for Solidity-heavy contract development and testing.
   - Use Hardhat when the repo already uses it or when plugin compatibility matters.
   - Prefer viem for modern TypeScript RPC interactions unless the codebase already uses ethers.
   - Prefer Anchor for Solana program work unless the repo clearly uses native Rust-only tooling.
4. Define invariants before implementation.
   - List state transitions, authorization rules, replay protections, pricing assumptions, rounding behavior, and admin powers.
   - Identify what must never happen and encode it in tests.
5. Implement with security-first defaults.
   - Minimize privileged roles.
   - Validate every external input.
   - Favor pull over push transfers when appropriate.
   - Check for reentrancy, unsafe external calls, signature misuse, PDA seed mistakes, and precision loss.
6. Test across happy paths and adversarial paths.
   - Add unit tests for exact state changes.
   - Add invariant, fuzz, or property-style tests where the stack supports them.
   - Simulate failure cases: bad signer, stale price, insufficient funds, duplicate execution, paused contract, rent issues, and account size issues.
7. Prepare deployment and operations.
   - Record config per network.
   - Verify addresses, constructor or initializer values, upgrade authority, multisig ownership, and monitoring hooks.
   - Document rollback or pause paths where applicable.

## Decision Guide

### EVM

Load [references/evm-solidity.md](references/evm-solidity.md) when the request involves Solidity, EVM tooling, standards, or RPC integrations.

Use this path for:
- ERC-20, ERC-721, ERC-1155, staking, vaults, governance, DEX, lending, permit flows, account abstraction
- Gas optimization, storage layout, proxy upgrades, event design, ABI encoding, signature verification

### Solana

Load [references/solana.md](references/solana.md) when the request involves Solana programs, Anchor, SPL assets, PDAs, or transaction composition.

Use this path for:
- Anchor instructions and accounts
- PDA derivation and authority models
- SPL token and Token-2022 integrations
- Compute budgeting, account sizing, rent, and CPI behavior

### Delivery And Security

Load [references/delivery-checklists.md](references/delivery-checklists.md) for cross-cutting delivery, audit, deployment, and incident-prevention guidance.

Use this path for:
- Threat modeling
- Pre-deploy reviews
- Audit-style code review
- Monitoring and incident response prep

## Implementation Rules

- Match the repository's existing stack before introducing new blockchain libraries.
- Keep chain-specific constants, addresses, decimals, seeds, and role identifiers centralized.
- Separate protocol rules from transport code. Contracts or programs enforce invariants; UI and backend layers should not be the only protection.
- Prefer explicit custom errors, clear events, and deterministic state transitions.
- Avoid hidden admin behavior. Surface authority, pause, mint, upgrade, and withdrawal capabilities clearly.
- For token math, reason in base units and document decimal assumptions.
- For signatures, specify the signed payload, domain separation method, nonce strategy, and expiry behavior.
- For upgrades, state who can upgrade, how initialization is protected, and how storage compatibility is preserved.

## Review Mode

When reviewing blockchain code:

1. Identify asset custody and privileged actors.
2. Trace every state transition and external call.
3. Check authorization, replay protection, accounting, rounding, and denial-of-service risks.
4. Check environment-specific risks such as reorg tolerance, oracle freshness, RPC trust, and upgrade authority.
5. Report findings in severity order with concrete file references, exploit path, and remediation.

## Helper Script

Use [scripts/select-stack.js](scripts/select-stack.js) to print a default stack recommendation for a chain and work type. Run it when the user asks which tooling to start with and the repository does not already force a choice.
