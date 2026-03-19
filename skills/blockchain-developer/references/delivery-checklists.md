# Blockchain Delivery Checklists

## Scoping Checklist

- Identify chain, network, wallet model, and transaction signer.
- Identify whether the source of truth lives onchain, offchain, or both.
- Identify privileged roles and how they are rotated or revoked.
- Identify user funds at risk and the maximum credible loss.
- Identify external dependencies: RPC, oracle, bridge, relayer, keeper, indexer.

## Build Checklist

- Centralize config by environment.
- Write invariants before complex implementation.
- Add events or logs for critical state transitions.
- Separate deployment scripts from runtime code.
- Keep emergency controls explicit and auditable.

## Review Checklist

- Trace asset movement and accounting.
- Trace authorization for every privileged path.
- Check replay protection for signatures, relays, and queued actions.
- Check precision handling, decimals, rounding direction, and overflow assumptions.
- Check upgrade, pause, mint, and withdrawal controls.
- Check dependency trust assumptions and failure behavior.

## Pre-Deploy Checklist

- Freeze exact package and compiler versions where reproducibility matters.
- Verify environment variables, RPC endpoints, deployer keys, and multisig targets.
- Dry-run deployment on a fork, local validator, or test network.
- Verify source code or publish IDL and ABI artifacts as appropriate.
- Store deployed addresses and config in a durable repo location.

## Post-Deploy Checklist

- Confirm ownership and authority assignments onchain.
- Confirm monitoring for failed jobs, unusual balance changes, and abnormal event volume.
- Confirm runbooks for pause, upgrade, rollback, and key rotation.
- Confirm user-facing docs reflect live addresses and network support.

## Audit-Style Findings Format

Use this structure when reporting issues:

1. Title
2. Severity
3. File reference
4. Impact
5. Exploit or failure path
6. Recommended fix
