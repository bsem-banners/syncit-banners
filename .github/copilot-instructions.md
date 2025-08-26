# Copilot Instructions for SynciTMobile

## Project Overview
- This is a React Native app built with Expo, using TypeScript and file-based routing (see the `app/` directory).
- Major features include group management, event scheduling, and user authentication.
- State and context are managed via React Contexts (see `contexts/`), with services for Firebase and notifications in `services/` and `config/`.
- The app integrates with Firebase (see `config/firebase.ts`, `google-services.json`, and `GoogleService-Info.plist`).

## Key Patterns & Conventions
- **File-based routing:** Each file in `app/` (e.g., `group-detail.tsx`, `add-event.tsx`) is a screen. Use `[param].tsx` for dynamic routes.
- **Context usage:** Use `AuthContext` and `GroupContext` for authentication and group state. Access via custom hooks in `contexts/`.
- **Service abstraction:** All Firebase/database logic is abstracted in `services/` and `config/`. Do not call Firebase APIs directly in components.
- **UI components:** Shared UI is in `components/` and `components/ui/`. Prefer these over inline styles or new components unless necessary.
- **Styling:** Use `StyleSheet.create` and follow the color palette in `constants/Colors.ts`.
- **Testing utilities:** Utilities for testing are in `utils/TestingUtils.ts` and `test-firebase.js`.

## Developer Workflows
- **Install dependencies:** `npm install`
- **Start development server:** `npx expo start`
- **Reset project:** `npm run reset-project` (moves starter code to `app-example/` and creates a blank `app/`)
- **Android/iOS setup:** Use Expo Go, emulators, or simulators as described in the README.

## Integration Points
- **Firebase:** All authentication, database, and notification logic is routed through service files. Update config in `config/firebase.ts` and related files.
- **External assets:** Images and fonts are in `assets/`.

## Examples
- To add a new screen, create a new file in `app/` (e.g., `app/new-feature.tsx`).
- To add a new context, place it in `contexts/` and provide a custom hook for access.
- To update group logic, edit `services/DatabaseService.ts` and use it via `GroupContext`.

## Special Notes
- Do not bypass context/providers for state or service access.
- Follow the file/folder naming conventions (camelCase for files, PascalCase for components).
- Use TypeScript types for all new code.

---
For more, see the project README or ask for clarification on any unclear workflow or pattern.
