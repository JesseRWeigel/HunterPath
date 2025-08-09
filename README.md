# Hunter's Path - Solo Leveling Inspired Game

A Solo Leveling-inspired idle/roguelite game built with React, TypeScript, and Express.js. Features dungeon clearing mechanics, stat progression systems, daily quests with penalties, shadow extraction mechanics, and fatigue management.

## 🌟 Features

- **PWA Support** - Installable as a mobile app
- **Offline Play** - Works without internet connection
- **Gates & Dungeons** - Clear dungeons of different ranks (E through S)
- **Stat System** - Allocate points to STR, AGI, INT, VIT, and LUCK
- **Shadow Extraction** - Recruit shadow allies from defeated bosses
- **Daily Quests** - Complete daily tasks or face penalties
- **Fatigue System** - Manage fatigue affecting combat performance
- **Instant Dungeon Keys** - Special items for bonus runs

## 🚀 Quick Start

### Prerequisites

- Node.js 18.18.0 or higher
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/hunters-path.git
cd hunters-path

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to play the game locally.

## 📱 PWA Features

This game is a Progressive Web App (PWA) that provides:

- **Installable** - Can be installed on mobile devices like a native app
- **Offline Support** - Works without internet connection once cached
- **Fast Loading** - Assets are cached for instant loading
- **App-like Experience** - Full-screen, no browser UI when installed

### Installing on Mobile

1. Open the game in your mobile browser
2. Tap "Install" when the prompt appears, or use "Add to Home Screen"
3. The game will be available as an app on your device

## 🏗️ Deployment Options

### Option 1: GitHub Pages (Recommended - Free)

1. Push your code to GitHub
2. Go to Repository Settings > Pages
3. Enable GitHub Pages (Source: GitHub Actions)
4. Every push to `main` branch will automatically deploy

### Option 2: Vercel (Free Tier)

1. Fork this repository to your GitHub account
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically on every push

### Option 3: Netlify (Free Tier)

1. Fork this repository to your GitHub account
2. Connect your repository to [Netlify](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist/public`

## 🔧 Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🎮 Game Mechanics

### Core Systems

- **Gates**: Enter dungeons to gain EXP and loot
- **Leveling**: Gain stat points on level up
- **Shadows**: Extract shadows from defeated bosses
- **Daily Quests**: Complete for bonuses or face penalties
- **Fatigue**: Manage fatigue for optimal performance

### Tips

1. Complete Daily Quest before running dungeons
2. Allocate stat points after leveling up
3. Extract shadows from defeated bosses (INT and LUCK help)
4. Manage fatigue by resting
5. Use Instant Dungeon Keys for bonus runs

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Express.js, Node.js
- **UI**: Tailwind CSS, shadcn/ui components
- **PWA**: Service Worker, Web App Manifest
- **Database**: PostgreSQL (Drizzle ORM)
- **Deployment**: GitHub Actions, Vercel/Netlify

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🐛 Issues

Please report bugs and feature requests on the GitHub issues page.
