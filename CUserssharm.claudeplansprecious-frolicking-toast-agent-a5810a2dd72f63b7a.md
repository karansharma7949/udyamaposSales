# Implementation Plan: Sales Performance Tracker Initial Setup

## Goal
Initialize the project structure, install dependencies, and set up the core architecture for the Sales Performance Tracker using Next.js (JS), Tailwind, shadcn/ui, Supabase, Zustand, and TanStack Query.

## Constraints
- NO TypeScript. Use `.js` and `.jsx` exclusively.
- Adhere to the specified folder structure.

## Phase 1: Environment & Dependencies
1. **Dependency Installation**:
   - Install core libraries: `npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query zustand recharts lucide-react`
   - Initialize shadcn/ui: `npx shadcn-ui@latest init` (Select "No" for TypeScript)
   - Install common shadcn components: `npx shadcn-ui@latest add button card input dropdown-menu sheet avatar`

2. **Environment Configuration**:
   - Create `.env.example` with:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Phase 2: Core Infrastructure
1. **Supabase Client Setup**:
   - `src/lib/supabase/client.js`: Initialize `createBrowserClient`.
   - `src/lib/supabase/server.js`: Initialize `createServerClient` for Server Components/Actions.
   - `src/lib/supabase/middleware.js`: Implement session refresh logic for Next.js middleware.

2. **State Management**:
   - **Server State**: Create `src/app/providers.jsx` as a client component to wrap the app in `QueryClientProvider`.
   - **Client State**: Initialize Zustand stores in `src/store/`:
     - `useAuthStore.js`: Manage user session, role (admin/employee).
     - `useUIStore.js`: Manage sidebar state, theme, and notification visibility.

3. **Utilities**:
   - `src/lib/utils.js`: Standard shadcn `cn` utility.

## Phase 3: Layout & Routing
1. **Root Layout**:
   - `src/app/layout.js`: Root HTML, body, Global CSS, and `Providers` wrapper.

2. **Reusable Layout System**:
   - Create a base `src/components/shared/LayoutWrapper.jsx` to handle the responsive shell (Sidebar + TopNav + Main content).
   - `src/app/admin/layout.jsx`: Use `LayoutWrapper` with admin-specific navigation links.
   - `src/app/employee/layout.jsx`: Use `LayoutWrapper` with employee-specific navigation links.

3. **Navigation Components**:
   - `src/components/shared/Sidebar.jsx`: Responsive sidebar using shadcn `Sheet` for mobile.
   - `src/components/shared/TopNav.jsx`: Breadcrumbs, User Profile, and Logout button.

## Phase 4: DX & Resilience
1. **Loading & Error Handling**:
   - `src/app/loading.jsx`: Global skeleton loader.
   - `src/app/error.jsx`: Global error boundary.
   - Implement segment-specific loading/error files for `admin/` and `employee/`.

2. **Responsive Foundation**:
   - Ensure `tailwind.config.js` is configured for the desired breakpoints.
   - Implement a mobile-first approach in `LayoutWrapper`.

## File Mapping
| Feature | Path | Purpose |
|---|---|---|
| Supabase Client | `src/lib/supabase/client.js` | Browser-side DB/Auth access |
| Supabase Server | `src/lib/supabase/server.js` | Server-side DB/Auth access |
| Query Provider | `src/app/providers.jsx` | TanStack Query context |
| Auth Store | `src/store/useAuthStore.js` | Client-side user state |
| UI Store | `src/store/useUIStore.js` | App UI state (Sidebar, etc) |
| Root Layout | `src/app/layout.js` | Global app shell |
| Admin Layout | `src/app/admin/layout.jsx` | Admin protected area shell |
| Emp Layout | `src/app/employee/layout.jsx` | Employee protected area shell |
| Sidebar | `src/components/shared/Sidebar.jsx` | Primary navigation |
| TopNav | `src/components/shared/TopNav.jsx` | Top utility bar |
