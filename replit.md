# LookMax - Replit Configuration

## Overview

LookMax is an AI-powered facial analysis and habit-tracking mobile application designed for systematic appearance enhancement. The app tracks facial metrics, provides daily improvement tips, and generates personalized routines. Built as a React Native/Expo application with an Express backend, it follows a premium fitness app aesthetic - minimal, data-driven, and motivational.

**Core Purpose**: Help users improve their appearance through measurable progress tracking and personalized improvement plans.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation with bottom tabs (4 main screens: Home, Scan, Plans, Profile)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: StyleSheet API with a custom theme system (dark-mode first design)
- **Animations**: React Native Reanimated for smooth transitions and progress indicators
- **Local Storage**: AsyncStorage for persisting user data, scan history, and preferences

### Backend Architecture
- **Server**: Express.js (v5) running on Node.js
- **API Design**: RESTful endpoints prefixed with `/api`
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains database models

### Project Structure
```
client/           # React Native/Expo frontend
├── components/   # Reusable UI components
├── screens/      # Main app screens
├── navigation/   # React Navigation configuration
├── hooks/        # Custom React hooks
├── lib/          # Utilities, storage, API client
├── constants/    # Theme, colors, typography

server/           # Express backend
├── index.ts      # Server entry point
├── routes.ts     # API route definitions
├── storage.ts    # Data access layer

shared/           # Shared code between client/server
├── schema.ts     # Drizzle database schema
```

### Key Design Decisions

1. **Monorepo Structure**: Client and server share types via `shared/` directory, ensuring type safety across the stack.

2. **Path Aliases**: Uses `@/` for client imports and `@shared/` for shared code, configured in both TypeScript and Babel.

3. **Theme System**: Centralized in `client/constants/theme.ts` with support for light/dark modes. Currently dark-mode focused.

4. **Local-First Storage**: Uses AsyncStorage for offline capability with the storage service pattern in `client/lib/storage.ts`.

5. **Component Architecture**: Follows atomic design principles with themed components (ThemedText, ThemedView) and specialized UI components (StatCard, CircularProgress).

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle Kit**: For database migrations (`npm run db:push`)

### Mobile Platform Services
- **Expo Camera**: For face scanning functionality
- **Expo Image Picker**: For avatar and photo selection
- **Expo Haptics**: For tactile feedback on interactions

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `react-native-reanimated`: Animations
- `react-native-svg`: SVG rendering for circular progress
- `expo-blur`: iOS blur effects for tab bar
- `drizzle-orm` + `drizzle-zod`: Database ORM with Zod validation

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API domain for client-server communication
- `REPLIT_DEV_DOMAIN`: Development domain (auto-set by Replit)

### Scripts
- `npm run expo:dev`: Start Expo development server
- `npm run server:dev`: Start Express development server
- `npm run db:push`: Push database schema changes