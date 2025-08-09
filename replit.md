# Hunter's Path - Solo Leveling Game

## Overview

Hunter's Path is a Solo Leveling-inspired idle/roguelite game built with React and TypeScript. The game features dungeon clearing mechanics, stat progression systems, daily quests with penalties, shadow extraction mechanics, and fatigue management. Players can explore gates of different ranks (E through S), level up their character through combat, allocate stat points, and extract shadows from defeated bosses. The application uses a full-stack architecture with Express.js backend and React frontend, utilizing shadcn/ui for the component library and Drizzle ORM for database management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **UI Framework**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom game-specific color schemes and dark mode support
- **State Management**: React hooks (useState, useEffect) for local component state
- **Data Fetching**: TanStack React Query for server state management and caching
- **Game Logic**: Single-page application with all game mechanics contained in the HuntersPath component

### Backend Architecture
- **Framework**: Express.js with TypeScript for REST API endpoints
- **Runtime**: Node.js with ES modules
- **Development**: tsx for TypeScript execution in development
- **Production Build**: esbuild for server-side bundling
- **Middleware**: Built-in request logging and error handling middleware

### Data Storage Solutions
- **Database**: PostgreSQL configured through Drizzle ORM
- **ORM**: Drizzle with schema definitions in shared directory
- **Connection**: Neon Database serverless connection
- **Migrations**: Drizzle Kit for schema management
- **Development Storage**: In-memory storage implementation for rapid prototyping

### Authentication and Authorization
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Schema**: Basic user table with username/password fields
- **Storage Interface**: Abstracted storage layer supporting both in-memory and database implementations

### Game Architecture
- **Game State**: Local React state management with real-time updates
- **Mechanics**: Idle/incremental game loop with dungeon exploration, stat allocation, and shadow extraction
- **Ranking System**: E-S rank progression system for gates and equipment
- **Fatigue System**: Resource management affecting player performance
- **Daily Quests**: Time-based quest system with penalties for non-completion

### External Dependencies
- **Database**: Neon Database (PostgreSQL) for persistent data storage
- **UI Components**: Radix UI primitives for accessible component foundations
- **Icons**: Font Awesome for game iconography
- **Fonts**: Google Fonts (Inter) for typography
- **Build Tools**: Vite for frontend bundling, esbuild for backend compilation
- **Development**: Replit integration with custom plugins for development environment

The architecture follows a separation of concerns pattern with shared types between frontend and backend, modular UI components, and a flexible storage abstraction that can switch between development and production data sources.