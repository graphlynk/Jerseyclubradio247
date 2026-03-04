---
description: Review recently changed files for bugs, quality issues, and consistency with Jersey Club Radio project conventions
argument-hint: "[file path — or leave blank to review git-staged/recently modified files]"
---

# Code Review — Jersey Club Radio

Review the code for quality, correctness, and consistency with this project's conventions.

## What to review

If `$ARGUMENTS` is provided, review that specific file or directory.
If no argument is given, find recently modified files using `git diff --name-only HEAD` or `git status`, then review those.

## Review checklist

### Bugs & correctness
- Null / undefined access on optional chaining that could throw
- State that is set but never cleaned up (timers, event listeners, blob URLs, subscriptions)
- `useEffect` with missing or wrong dependencies
- Async functions that don't handle rejections
- Keys missing or non-unique in lists

### React patterns
- Components that re-render unnecessarily (missing `memo`, `useCallback`, `useMemo`)
- State that belongs in context being passed 3+ levels deep as props
- Inline object/array literals in JSX props causing re-renders every render
- `<style>` tags injected inside JSX (antipattern — use Tailwind or motion instead)

### Project conventions
- Animations should use `motion/react` (`motion.div`, `AnimatePresence`, `whileTap`, `whileHover`) — not CSS transitions on interactive elements
- Colors must match the design palette:
  - Primary purple: `#9D00FF`
  - Pink accent: `#FF0080`
  - Gold (24K crate): `#fcf6ba`, `#bf953f`
  - Purple text glow: `#C084FC`
  - Background dark: `#06000F`, `#0D001E`, `#1a003a`
- Interactive buttons must have `aria-label` when they contain only an icon
- Mobile breakpoint is `md:` (768px) — mobile-first layout required
- Player and modal z-index: player is `z-50`, modals are `z-[200]`
- Blob URLs created with `URL.createObjectURL` must be revoked in a `useEffect` cleanup

### TypeScript
- No `any` types unless absolutely unavoidable (add a comment explaining why)
- Props interfaces should be defined above the component, not inline
- Event handler types should use React's typed events (`React.MouseEvent`, etc.)

### Performance
- Images should use `onError` fallback (project uses `handleThumbnailError`)
- Large components (>300 lines) should be flagged for potential splitting
- Canvas operations should be debounced or gated behind a ref to prevent duplicate runs

## Output format

For each file reviewed:
1. List any **bugs** (with line numbers)
2. List any **pattern violations** (with line numbers)
3. List any **minor improvements** (optional, non-blocking)
4. Give an overall verdict: ✅ Clean / ⚠️ Minor issues / ❌ Needs fixes

Be direct and specific. Skip files that look clean — no need to praise every line.
