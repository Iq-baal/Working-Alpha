# PayMe Protocol - Engineering Skills & Patterns

This document tracks capabilities discovered, architectural patterns, reusable solutions, and lessons learned during the production readiness phase.

## Discovered Capabilities

- **Current Stack**: React, Vite, Framer Motion, Privy (Auth), Convex (Backend/Database).
- **Blockchain**: Solana Web3.js integration.

## Architectural Patterns

- **Devnet Architecture (Path A)**:
  - **Frontend**: React, Vite, Framer Motion (Hosted on Cloudflare Pages)
  - **Backend/DB**: Convex (Serverless, Real-time)
  - **Auth**: Privy
  - **Storage**: Convex File Storage
- **Mainnet Target Architecture (Path B - Future)**:
  - **Backend**: Node.js in Docker
  - **Database**: PostgreSQL
  - **Storage**: MinIO
  - **Secrets**: HashiCorp Vault

## Reusable Solutions

- _To be populated._

## Lessons Learned

- _To be populated._
