# PayMe Protocol

A modern, self-hosted payment application built with React, Appwrite, and Solana blockchain.

## 🚀 Quick Links

- **Live App:** https://payme-protocol.pages.dev
- **Custom Domain:** https://payme-protocol.cc
- **Backend API:** https://api.payme-protocol.cc/v1
- **Appwrite Console:** https://api.payme-protocol.cc/console/

## 📋 Current Status

**Migration Status:** 🟡 85% Complete - Ready for Final Setup

See [STATUS.md](STATUS.md) for detailed progress and next steps.

## 🏗️ Architecture

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS 4.2
- **Animations:** Framer Motion
- **Hosting:** Cloudflare Pages
- **Domain:** payme-protocol.cc

### Backend
- **Platform:** Appwrite 1.8.1 (Self-hosted)
- **Server:** Contabo VPS (Ubuntu 24.04)
- **Storage:** Contabo S3 Object Storage
- **Domain:** api.payme-protocol.cc
- **SSL:** Cloudflare Origin Certificate

### Blockchain
- **Network:** Solana Devnet
- **Token:** USDC (Devnet)
- **Wallet:** Client-side generation with secure storage

## 🛠️ Tech Stack

### Frontend Dependencies
- React 19.0.0
- Appwrite SDK 23.0.0
- Solana Web3.js 1.98.0
- Framer Motion 11.18.2
- Lucide React (icons)
- React QR Code

### Development Tools
- TypeScript 5.7.2
- Vite 6.0.5
- Tailwind CSS 4.2.1
- PostCSS + Autoprefixer

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Appwrite CLI (for backend management)
- Wrangler CLI (for deployment)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Iq-baal/Alpha-1.git
   cd Alpha-1
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up Appwrite database:**
   ```bash
   export APPWRITE_API_KEY="your_api_key"
   node setup-appwrite.js
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Cloudflare Pages
```bash
./deploy.sh
```

Or manually:
```bash
wrangler pages deploy dist --project-name payme-protocol --branch production
```

## 📚 Documentation

- **[STATUS.md](STATUS.md)** - Current status and quick start guide
- **[SETUP-GUIDE.md](SETUP-GUIDE.md)** - Complete setup instructions
- **[CHECKLIST.md](CHECKLIST.md)** - Detailed task checklist
- **[PROGRESS.md](PROGRESS.md)** - Historical progress log
- **[HANDOFF.md](HANDOFF.md)** - Technical handoff document

## 🔧 Configuration

### Environment Variables

```bash
# Appwrite Backend
VITE_APPWRITE_ENDPOINT=https://api.payme-protocol.cc/v1
VITE_APPWRITE_PROJECT=69b1b3160029daf7b418

# Solana Configuration
VITE_TREASURY_WALLET=5U4Jmc2N4ah7pv8xTsSRVyX5VxNRt1B4ugM3YS4wnbhS
VITE_SPONSOR_WALLET=2kqMXNofB1nnVtoeXJMKvFuXqqUv45ePWBbFPSMW6Whu
VITE_BONUS_VAULT=2kqMXNofB1nnVtoeXJMKvFuXqqUv45ePWBbFPSMW6Whu
VITE_SOLANA_RPC=https://api.devnet.solana.com
VITE_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
```

## 🗄️ Database Schema

The application uses Appwrite with the following collections:

- **users** - User profiles and authentication
- **transactions** - Payment transactions
- **notifications** - User notifications
- **contacts** - User contact lists
- **merchants** - Merchant registrations
- **supportMessages** - Support chat messages
- **systemConfig** - System configuration

See `migration/appwrite-collections.json` for detailed schema.

## 🔐 Security

- Client-side wallet generation with secure localStorage
- Encrypted wallet backup/export
- HTTPS everywhere (Cloudflare Origin Certificate)
- API key authentication for backend
- Rate limiting and CORS policies

## 🧪 Testing

```bash
# Build and preview locally
npm run build
npm run preview
```

### Test Checklist
- [ ] User registration
- [ ] User login
- [ ] Send money
- [ ] Receive money
- [ ] Transaction history
- [ ] Notifications
- [ ] Profile settings

## 📊 Features

### Core Features
- ✅ User authentication (email/password)
- ✅ Client-side Solana wallet generation
- ✅ Send/receive USDC on Solana
- ✅ Transaction history
- ✅ Contact management
- ✅ QR code generation
- ✅ Receipt generation
- ✅ Push notifications
- ✅ Profile management

### Advanced Features
- ✅ Gift money with eligibility tiers
- ✅ Request money from contacts
- ✅ Rich mode (donate/charity)
- ✅ Referral system
- ✅ Admin panel
- ✅ Support chat
- ✅ Merchant registration

## 🐛 Troubleshooting

### Common Issues

**Issue: "User missing scopes" error**
- Solution: Ensure API key has correct scopes in Appwrite Console

**Issue: Build fails**
- Solution: Clear node_modules and reinstall: `rm -rf node_modules && npm install`

**Issue: SSL certificate errors**
- Solution: Cloudflare Origin Certificate is configured on VPS. Check Traefik logs.

**Issue: Authentication not working**
- Solution: Verify VITE_APPWRITE_ENDPOINT uses `https://` and clear browser cache

See [SETUP-GUIDE.md](SETUP-GUIDE.md) for more troubleshooting tips.

## 📝 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build locally
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Appwrite](https://appwrite.io/)
- Hosted on [Cloudflare Pages](https://pages.cloudflare.com/)
- Blockchain powered by [Solana](https://solana.com/)

## 📞 Support

For issues and questions:
1. Check the documentation in this repository
2. Review [SETUP-GUIDE.md](SETUP-GUIDE.md)
3. Check Appwrite logs: `docker logs appwrite-appwrite-1`

---

**Last Updated:** March 12, 2026  
**Version:** 0.1.0  
**Status:** Production Ready (pending final setup)
