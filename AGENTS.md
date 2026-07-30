<!-- BEGIN:nextjs-agent-rules -->
# BuySell Production Engineering & Coding Standards

This codebase enforces industry-standard software engineering practices to maximize stability and prevent runtime failures.

## 1. Strict Typing & Zero-`any` Standard
- Use strict domain types defined in `src/types/index.ts` (`Order`, `Product`, `Organization`, `Profile`, `ApiResponse<T>`).
- Avoid implicit `any` parameters or unchecked property access.

## 2. API & Database Error Resilience
- All Next.js API route handlers must wrap logic in structured `try-catch` blocks and return standardized JSON using `successResponse` or `handleApiError` from `src/lib/apiResponse.ts`.
- Database queries that join tables (e.g., `organizations!orders_buyer_organization_id_fkey`) must include fallback queries (raw selects or local persistence merge) in case schema or foreign key constraints vary.

## 3. UI Error Boundaries & Loading States
- Critical views and components must be wrapped in `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) to prevent white-screen crashes.
- Use `BuySellLoader` (`src/components/BuySellLoader.tsx`) for consistent page and component loading states.

## 4. Mandatory Pre-Commit Type Verification
- Always execute `npx tsc --noEmit` to verify 100% type safety before pushing changes.

<!-- END:nextjs-agent-rules -->
