# PayMe Protocol - PocketBase Migration Handoff

Last updated: 2026-03-13

## Migration Overview

**Objective**: Migrate from Appwrite to PocketBase with Web3 authentication and wallet creation, deploy to Cloudflare Pages with enhanced security.

## Current State (Pre-Migration)

- **Frontend**: React + Vite + TypeScript
- **Current Backend**: Appwrite self-hosted on VPS (62.171.154.123)
- **Current Domain**: api.payme-protocol.cc
- **Current Auth**: Appwrite authentication with client-side Solana wallet generation
- **Current Hosting**: Cloudflare Pages (payme-protocol.pages.dev)

## Target Architecture

- **Backend**: PocketBase (self-hosted on VPS)
- **Authentication**: Web3 wallet-based authentication
- **Wallet Creation**: Integrated Web3 wallet generation
- **Frontend Hosting**: Cloudflare Pages (cleaned and redeployed)
- **Security**: Enhanced security practices and hardening

## Migration Progress

### Phase 1: Environment Setup ✅
- [x] Delete old handoff/progress files
- [x] Create new project documentation
- [ ] Access VPS and reset environment
- [ ] Install PocketBase on VPS
- [ ] Configure PocketBase with proper security settings

### Phase 2: Backend Migration
- [ ] Set up PocketBase database schema
- [ ] Implement Web3 authentication endpoints
- [ ] Create wallet generation and management APIs
- [ ] Migrate existing data from Appwrite to PocketBase
- [ ] Implement security hardening measures

### Phase 3: Frontend Updates
- [ ] Remove Appwrite SDK dependencies
- [ ] Implement Web3 authentication flow
- [ ] Update API calls to use PocketBase
- [ ] Integrate wallet creation functionality
- [ ] Update environment configuration

### Phase 4: Deployment & Cleanup
- [ ] Clean up Wrangler/Cloudflare configuration
- [ ] Deploy frontend to Cloudflare Pages
- [ ] Configure domain and SSL
- [ ] Perform security audit
- [ ] Production testing and verification

## Security Considerations

- Implement proper CORS policies
- Use HTTPS everywhere
- Secure wallet private key storage
- Rate limiting and DDoS protection
- Input validation and sanitization
- Secure session management
- Environment variable protection

## Next Steps

1. SSH into VPS and reset environment
2. Install and configure PocketBase
3. Begin backend migration process

## Important Notes

- Preserve existing user data during migration
- Maintain backward compatibility where possible
- Implement comprehensive error handling
- Document all security measures implemented
