# Hunter's Path

An idle/roguelite RPG built with React, TypeScript, and Express.js. Features dungeon clearing mechanics, stat progression systems, daily quests with penalties, spirit binding mechanics, and fatigue management.

## 🌟 Features

- **PWA Support** - Installable as a mobile app
- **Offline Play** - Works without internet connection
- **Gates & Dungeons** - Clear dungeons of different ranks (E through S)
- **Stat System** - Allocate points to STR, AGI, INT, VIT, and LUCK
- **Spirit Binding** - Recruit bound spirits from defeated bosses
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
git clone https://github.com/jesserweigel/HunterPath.git
cd HunterPath

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

## 🌐 Live Demo

Play the game online: **[https://jesserweigel.github.io/HunterPath/](https://jesserweigel.github.io/HunterPath/)**

## 🏗️ Deployment

This project is automatically deployed to GitHub Pages:

1. **Automatic Deployment** - Every push to the `main` branch triggers a new deployment
2. **GitHub Actions** - Builds and deploys automatically using the included workflow
3. **HTTPS Enabled** - Secure connection for PWA functionality

### Manual Deployment

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
- **Spirits**: Bind spirits from defeated bosses
- **Daily Quests**: Complete for bonuses or face penalties
- **Fatigue**: Manage fatigue for optimal performance

### Tips

1. Complete Daily Quest before running dungeons
2. Allocate stat points after leveling up
3. Bind spirits from defeated bosses (INT and LUCK help)
4. Manage fatigue by resting
5. Use Instant Dungeon Keys for bonus runs

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Express.js, Node.js
- **UI**: Tailwind CSS, shadcn/ui components
- **PWA**: Service Worker, Web App Manifest
- **Database**: PostgreSQL (Drizzle ORM)
- **Deployment**: GitHub Actions, GitHub Pages

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
