---
name: react-performance-architect
description: "Architect Astro + React apps for optimal web performance. Use when designing component hierarchies, choosing Astro client directives, optimizing React islands, reducing bundle size, or improving INP/LCP metrics. Triggers on component architecture decisions, island boundaries, client:load vs client:visible vs client:idle decisions, re-render optimization, state placement, or performance profiling."
---

# Astro + React Performance Architect

Architect Astro apps with React islands for optimal performance. Based on web performance fundamentals.

## Core Principles

### 1. Zero JS by Default

Astro ships zero JavaScript unless you explicitly opt in. Every `client:*` directive adds JS—be intentional.

### 2. Islands for Interactivity Only

Use React islands ONLY for interactive components. Static content stays as Astro components (zero JS).

### 3. Re-renders Stay Inside Islands

React re-render rules only apply within an island. Islands are isolated—state in one doesn't affect others.

### 4. Critical Path First

Load and hydrate the most important interactive content first. Defer everything else.

## Astro Client Directive Selection

```
Is this component interactive?
├─ NO → Astro component (zero JS) ✓
└─ YES → Does user need it immediately?
         ├─ YES → Is it above the fold?
         │        ├─ YES → client:load
         │        └─ NO → client:visible
         └─ NO → client:idle (or client:visible)
```

### Client Directive Reference

| Directive | When to Use | JS Loaded |
|-----------|-------------|-----------|
| (none) | Static content | Never |
| `client:load` | Critical interactive (nav, hero CTA) | Immediately |
| `client:idle` | Important but not urgent (forms, comments) | After page idle |
| `client:visible` | Below fold (carousels, accordions) | When scrolled into view |
| `client:media` | Responsive (mobile menu) | When media query matches |
| `client:only="react"` | No SSR needed (client-only widgets) | Immediately, no HTML |

### Island Examples

```astro
---
// page.astro
import Header from '../components/Header.astro';  // Static - zero JS
import SearchBar from '../components/SearchBar';  // React island
import Comments from '../components/Comments';    // React island
import Footer from '../components/Footer.astro';  // Static - zero JS
---

<Header />  <!-- No JS -->

<SearchBar client:load />  <!-- Critical: loads immediately -->

<main>
  <article set:html={content} />  <!-- Static HTML -->
</main>

<Comments client:visible />  <!-- Loads when scrolled to -->

<Footer />  <!-- No JS -->
```

## React Island Patterns

Within a React island, standard React performance rules apply.

### Pattern 1: Move State Down

Move state to the lowest component that needs it.

```tsx
// ❌ Bad: State at island root re-renders entire island
function SearchIsland() {
  const [search, setSearch] = useState('');
  return (
    <div>
      <SearchInput value={search} onChange={setSearch} />
      <ExpensiveResults />  {/* Re-renders on every keystroke! */}
    </div>
  );
}

// ✅ Good: State isolated to where it's used
function SearchIsland() {
  return (
    <div>
      <SearchWithResults />  {/* Self-contained */}
      <ExpensiveOtherStuff />  {/* Never re-renders from search */}
    </div>
  );
}

function SearchWithResults() {
  const [search, setSearch] = useState('');
  return (
    <>
      <SearchInput value={search} onChange={setSearch} />
      <Results query={search} />
    </>
  );
}
```

### Pattern 2: Components as Children

Anything passed as props/children escapes re-render boundary.

```tsx
// ✅ Children don't re-render when wrapper state changes
function ModalIsland({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && <Modal>{children}</Modal>}
    </>
  );
}
```

### Pattern 3: Memoization (Last Resort)

Use only when patterns 1-2 don't apply.

```tsx
const ExpensiveList = React.memo(({ items, onSelect }) => {
  return items.map(item => <Item key={item.id} {...item} />);
});
```

## Island Architecture Decisions

### When to Split Islands

```
Should this be one island or multiple?

Do parts need to share state?
├─ YES → One island
└─ NO → Do they need different hydration timing?
         ├─ YES → Separate islands
         └─ NO → Could be either (prefer smaller)
```

### Sharing State Between Islands

Islands are isolated. For shared state:

| Method | When to Use |
|--------|-------------|
| Nano Stores | Simple reactive state across islands |
| URL params | Shareable, back/forward support |
| Custom events | Loose coupling between islands |
| Astro middleware | Server-side shared data |

```tsx
// Using Nano Stores (recommended)
// stores/cart.ts
import { atom } from 'nanostores';
export const cartCount = atom(0);

// CartButton.tsx (island 1)
import { useStore } from '@nanostores/react';
import { cartCount } from '../stores/cart';
function CartButton() {
  const count = useStore(cartCount);
  return <button>Cart ({count})</button>;
}

// AddToCart.tsx (island 2)
import { cartCount } from '../stores/cart';
function AddToCart() {
  return <button onClick={() => cartCount.set(c => c + 1)}>Add</button>;
}
```

## Bundle Size Optimization

Astro automatically code-splits per page and per island. Focus on:

### Audit Strategy

1. Check island count: `npx astro build` shows JS per page
2. Analyze React chunks: `npx vite-bundle-visualizer`
3. Identify: Heavy islands, duplicate libraries across islands

### Common Wins

| Problem | Solution |
|---------|----------|
| Full lodash import | Import specific: `import debounce from 'lodash/debounce'` |
| Heavy icon libraries | Import individual icons, not entire set |
| Moment.js | Replace with date-fns or native Intl |
| Large React islands | Split into smaller islands with `client:visible` |
| Shared deps in islands | Astro dedupes automatically, but check |

### Tree Shaking Requirements

- Use ES modules (`import/export`), not CommonJS
- Check library supports tree shaking: `npx is-esm <package>`
- Astro tree-shakes unused exports from islands

## Astro + React Integration

### Passing Props from Astro to React

```astro
---
// page.astro
const user = await getUser();
---
<UserProfile client:load user={user} />
```

### Passing Astro Children to React

```astro
---
import Carousel from '../components/Carousel';
---
<Carousel client:visible>
  <!-- Static HTML passed as children -->
  <img src="/slide1.jpg" alt="Slide 1" />
  <img src="/slide2.jpg" alt="Slide 2" />
</Carousel>
```

### Nested Islands

Avoid nesting React islands inside React islands—use one larger island instead:

```astro
<!-- ❌ Bad: Nested islands -->
<Sidebar client:load>
  <UserMenu client:load />  <!-- Creates separate hydration -->
</Sidebar>

<!-- ✅ Good: Single island with React children -->
<Sidebar client:load />
<!-- Where Sidebar.tsx renders UserMenu internally -->
```

## Performance Debugging

### Astro Build Output

```bash
npx astro build
# Shows per-page JS size:
# /index.html        12.4kB JS
# /about/index.html   0kB JS   ← No islands, no JS!
# /blog/index.html   45.2kB JS
```

### Chrome DevTools Checklist

1. Record in Guest/Incognito mode (no extensions)
2. Check: Does HTML render before JS loads? (should with Astro)
3. Look for hydration timing (when islands become interactive)
4. Enable CPU throttling for realistic mobile simulation

### React DevTools (within islands)

1. Enable "Highlight updates when components render"
2. Use Profiler to record interactions
3. Colored components = re-rendered during interaction

### View Transitions Debugging

```astro
---
import { ViewTransitions } from 'astro:transitions';
---
<head>
  <ViewTransitions />
</head>
```

Check: Do islands re-hydrate correctly after navigation?

## Architecture Decision Guide

See [references/architecture-decisions.md](references/architecture-decisions.md) for detailed decision trees on:
- Astro vs React component selection
- Island boundary decisions
- Client directive selection
- State sharing strategies
- When to use View Transitions
