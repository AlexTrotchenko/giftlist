# Architecture Decision Guide

Detailed decision trees for Astro + React performance architecture.

## Astro vs React Component Decision

```
Does this component need interactivity?
├─ NO → Astro component (.astro) ✓
│       Zero JavaScript shipped
└─ YES → What kind of interactivity?
         ├─ Simple (toggle, accordion) → Consider:
         │  ├─ CSS-only solution?
         │  ├─ Web component?
         │  └─ Small React island
         └─ Complex (forms, state, effects) → React island
```

### Component Type Guidelines

| Component | Type | Reason |
|-----------|------|--------|
| Header/Nav (static) | Astro | No JS needed |
| Mobile menu toggle | React island | Needs state |
| Hero section | Astro | Static content |
| Hero CTA button | Astro or `<a>` | Links don't need JS |
| Search bar | React island | Input + results |
| Blog post content | Astro | Static markdown |
| Comments section | React island | Interactive |
| Footer | Astro | Static |
| Cookie banner | React island (`client:idle`) | Interactive but not urgent |

## Client Directive Decision Tree

```
Is this island critical for page function?
├─ YES → client:load
│        (nav, auth, main CTA)
└─ NO → Is it above the fold?
        ├─ YES → client:idle
        │        (secondary actions, non-critical widgets)
        └─ NO → client:visible
                (comments, carousels, "load more")
                
Special cases:
├─ Responsive-only → client:media="(max-width: 768px)"
└─ No SSR possible → client:only="react"
```

## Island Boundary Decisions

```
Should these be one island or separate?

Do components share state?
├─ YES → One island
│        └─ Or use Nano Stores if:
│           ├─ Different hydration needs
│           └─ Widely separated in DOM
└─ NO → Do they have same hydration timing?
        ├─ YES → Could be either
        │        └─ Prefer smaller (less JS per interaction)
        └─ NO → Separate islands
                (allows client:load vs client:visible)
```

### Island Size Guidelines

| Island Size | When Appropriate |
|-------------|------------------|
| Tiny (<1KB) | Single button/toggle |
| Small (1-10KB) | Form, menu, widget |
| Medium (10-50KB) | Feature section |
| Large (>50KB) | Consider splitting |

## State Placement Decision Tree (Within Islands)

```
Does only ONE component use this state?
├─ YES → State lives in that component ✓
└─ NO → Which components need it?
         ├─ Same island → Lift to common parent
         ├─ Different islands → Nano Stores
         └─ Server + client → Astro props + island state
```

### State Location by Type

| State Type | Location | Why |
|------------|----------|-----|
| Form input | Inside island | Isolate keystroke re-renders |
| Modal open/close | Island root | Modal + trigger same island |
| Cart count | Nano Stores | Multiple islands need it |
| User session | Nano Stores or Context | Global |
| URL filters | URL params | Shareable, SSR-friendly |
| Server data | Astro → props | SSR, then island hydrates |

## Page Architecture Patterns

### Pattern 1: Static Shell + Interactive Islands

```
┌─────────────────────────────────────┐
│ Header.astro (static)               │
├─────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────┐ │
│ │ SearchBar   │ │ Hero.astro      │ │
│ │ client:load │ │ (static)        │ │
│ └─────────────┘ └─────────────────┘ │
├─────────────────────────────────────┤
│ Content.astro (static markdown)     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Comments client:visible         │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Footer.astro (static)               │
└─────────────────────────────────────┘
```

### Pattern 2: Dashboard (Heavy Islands)

```
┌─────────────────────────────────────┐
│ Nav.tsx client:load                 │
├──────────────┬──────────────────────┤
│ Sidebar.tsx  │ Dashboard.tsx        │
│ client:load  │ client:load          │
│              │ (main interactive)   │
└──────────────┴──────────────────────┘

Consider: If everything is client:load, 
maybe pure React app is simpler?
```

## Memoization Decision Tree (Within Islands)

```
Is the component slow during re-renders?
├─ NO → Don't memoize
└─ YES → Can you move state down?
         ├─ YES → Do that first ✓
         └─ NO → Can you split into separate islands?
                 ├─ YES → Do that (islands are isolated)
                 └─ NO → React.memo as last resort
```

## View Transitions Considerations

```
Using View Transitions?
├─ Islands persist across navigation
├─ State in Nano Stores persists
├─ Island state resets unless:
│  └─ Component has transition:persist
└─ Test: Do islands re-hydrate correctly?
```

## Performance Metric Targets

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP | < 2.5s | 2.5-4s | > 4s |
| FCP | < 1.8s | 1.8-3s | > 3s |
| INP | < 200ms | 200-500ms | > 500ms |
| Total JS (page) | < 50KB | 50-150KB | > 150KB |
| Per-island JS | < 20KB | 20-50KB | > 50KB |

## Quick Reference

**Astro advantage**: Ship 0KB JS for static content.

**Island checklist**:
1. Does it need JS? → If no, use Astro component
2. When does it need JS? → Pick correct `client:*`
3. How big is it? → Consider splitting if >50KB
4. Does it share state? → Use Nano Stores across islands

**Red flags**:
- Every page has 100KB+ JS → Too many/large islands
- Using `client:load` everywhere → Audit necessity
- State in React Context across islands → Use Nano Stores
- Nested React islands → Merge into one
