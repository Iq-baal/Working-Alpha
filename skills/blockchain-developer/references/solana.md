# Solana Reference

## Use This Reference For

- Solana programs in Rust
- Anchor projects and tests
- PDA design and account constraints
- SPL token or Token-2022 flows
- Client transaction assembly and simulation

## Preferred Defaults

- Prefer Anchor when the codebase already uses Anchor or when account validation and IDL generation matter.
- Prefer explicit PDA seed schemas and centralize them.
- Simulate transactions before broadcast when debugging client flows.
- Treat account size, rent, and compute budget as first-order design concerns.

## Design Checklist

- Define each account's owner, mutability, signer requirements, and lifecycle.
- Define PDA seeds, bump handling, and upgrade authority.
- Define CPI boundaries and what downstream programs are trusted.
- Define how token authority, freeze authority, mint authority, and metadata authority are controlled.

## Common Solana Risks

- Missing account constraints or incorrect owner checks
- PDA seed mismatches between program and client
- Account reinitialization or close-account edge cases
- Compute exhaustion from large loops or repeated CPI
- Rent or space miscalculation
- Privilege escalation through unchecked remaining accounts
- Fragile client instruction ordering

## Implementation Guidelines

- Keep instruction handlers small and move business rules into testable helpers.
- Validate account relationships explicitly, even when Anchor derives part of the checking.
- Minimize reliance on unchecked remaining accounts.
- Document PDA purpose and seed layout near the account definitions.
- Make authority transfer and upgrade authority decisions explicit.

## Testing Expectations

- Test successful instruction execution and account state changes.
- Test wrong signer, wrong owner, wrong PDA, wrong mint, and duplicate execution paths.
- Test account initialization and reinitialization boundaries.
- Test client transaction assembly for realistic account metas and ordering.
- Use local validator or equivalent integration coverage for stateful flows.

## Deployment Expectations

- Confirm program id, upgrade authority, and environment-specific addresses.
- Confirm account sizing assumptions and migrations.
- Confirm client code uses the matching IDL and program id.
- Record SPL mint addresses, PDA seeds, and authority recipients per environment.
