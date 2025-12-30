# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server at localhost:4321
npm run build        # Build production site to ./dist/
npm run preview      # Build and preview locally with Wrangler
npm run deploy       # Build and deploy to Cloudflare Workers
npm run cf-typegen   # Regenerate Cloudflare Worker type definitions
```

## Architecture

**Stack:** Astro 5 + React 19 + TailwindCSS 4 + Cloudflare Workers

**Rendering Model:** Astro static pages with React islands. Use `client:load` directive on React components that need interactivity.

**Routing:** File-based via `src/pages/*.astro`. Each `.astro` file becomes a route.

**Components:**
- Astro components (`.astro`) for static/layout content
- React components (`.tsx`) for interactive elements
- Uses shadcn/ui with Radix primitives and Lucide icons

**Component Organization:**
- `src/components/ui/` - shadcn/ui primitives (DO NOT modify directly)
- `src/components/` - Custom application components (wrappers and compositions)
- Always create wrapper components in `src/components/` to consume shadcn primitives
- Never edit files in `src/components/ui/` directly; extend via wrappers instead

**When Adding or Modifying Components:**
- Always use the `react-performance-architect` skill for guidance
- Create wrappers around shadcn components rather than modifying them
- Keep shadcn primitives pristine for easy updates

**Styling:**
- TailwindCSS v4 with `@theme` directive in `src/styles/global.css`
- CSS variables for theming using oklch color space
- Dark mode via `dark` variant
- Use `cn()` from `@/lib/utils` to merge class names
- DO NOT write custom CSS; use TailwindCSS utility classes exclusively

**Path Aliases:** `@/*` resolves to `src/*`

## Issue Tracking

This project uses beads (`bd`) for AI-supervised issue tracking. See `AGENTS.md` for the mandatory session workflow including issue updates and pushing changes.

## Beads Task Workflow

**Before starting a task:**
1. Use the `perplexity-search` skill to research best practices, current documentation, and implementation patterns
2. Add research findings as comments to the task: `bd comments add <task-id> "<findings>"`

**After completing a task:**
1. Close with detailed summary: `bd close <task-id> "<what was done>"`
2. Add implementation notes to dependent/unblocked tasks with relevant details they'll need
3. Include: file paths created, patterns used, gotchas discovered
