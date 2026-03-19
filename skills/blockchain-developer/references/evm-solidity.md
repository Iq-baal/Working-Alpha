# EVM And Solidity Reference

## Use This Reference For

- Solidity contracts and libraries
- Foundry or Hardhat setup decisions
- ERC token standards and extensions
- viem or ethers integration
- Proxy, upgrade, and signature design

## Preferred Defaults

- Prefer Foundry for contract-first repos.
- Prefer `forge test` with fuzz and invariant coverage where feasible.
- Prefer OpenZeppelin battle-tested components over custom implementations for common token and access-control patterns.
- Prefer `viem` in TypeScript unless the repo already standardizes on `ethers`.
- Prefer immutable configuration where governance does not require upgrades.

## Design Checklist

- Define actors: user, admin, operator, relayer, keeper, multisig, oracle.
- Define critical assets: tokens, shares, collateral, fees, signatures, permits.
- Define invariants: supply bounds, accounting conservation, single-use nonces, collateralization, withdrawal limits.
- Define trust assumptions: oracle source, offchain signer, sequencer or relayer, privileged pauser, upgrade admin.

## Common EVM Risks

- Reentrancy around token transfer hooks or arbitrary external calls
- Missing or inconsistent access control
- Signature replay across chains, contracts, or function intents
- Precision loss, rounding direction bugs, decimal mismatch
- Unchecked return values or unsafe ERC-20 assumptions
- Storage collision or initializer misuse in upgradeable contracts
- Oracle manipulation, stale price use, sandwichable execution
- Denial of service through unbounded loops or griefable state

## Solidity Implementation Guidelines

- Use custom errors for predictable failure surfaces.
- Emit events for user-visible state transitions and admin actions.
- Use checks-effects-interactions where relevant, but do not treat it as a substitute for full reentrancy analysis.
- Isolate math and pricing functions for easier fuzzing.
- Encode role checks and pausing behavior explicitly.
- Document every privileged function with the intended operator.

## Testing Expectations

- Unit-test each state-changing function.
- Add revert-path tests for unauthorized access and invalid state.
- Add fuzz tests for math and state transitions.
- Add invariant tests for supply conservation, balance bounds, and nonce uniqueness where applicable.
- Run gas snapshots only after correctness is established.

## Deployment Expectations

- Verify constructor or initializer parameters.
- Verify ownership, admin, proxy admin, and multisig recipients.
- Record contract addresses by network.
- Verify source code where the chain ecosystem expects it.
- Confirm emergency controls: pause, rate limit, guardian, or kill switch if present.
