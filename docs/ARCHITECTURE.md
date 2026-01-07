# Gift List App - Architecture Document

## Overview

A gift list sharing application that allows users to create wishlists, share them with groups or individuals, and coordinate gift-giving without spoiling surprises.

---

## Concept Design

Based on Daniel Jackson's *Essence of Software* methodology. The app is composed of 8 independent concepts:

| Concept | Purpose |
|---------|---------|
| **User** | Establish identity for personalized experience |
| **Session** | Sustained interaction without repeated authentication |
| **Invitation** | Controlled group membership through explicit consent |
| **Group** | Bundle users for collective operations |
| **Wishlist** | Let someone express what gifts they want (active → received → archived lifecycle) |
| **Tag** | Control who can see which items |
| **Claim** | Prevent duplicate gifts by reserving items (supports purchase tracking) |
| **Notification** | Inform users of state changes they didn't initiate |

### Key Design Constraints

- Owner cannot tag items with themselves
- Owner cannot tag items with groups they belong to
- One claim per item (first come, first served)
- Claims are hidden from item owner, visible to all other recipients
- Claims released automatically when user loses access

---

## Technical Stack

### Platform: Cloudflare

| Service | Purpose |
|---------|---------|
| **Pages** | Host Astro application |
| **Workers** | API endpoints, server-side logic |
| **D1** | Primary database (SQLite at edge) |
| **R2** | Image storage for gift photos |
| **KV** | Cache, rate limiting |
| **Queues** | Async notification processing |

### Frontend

| Technology | Purpose |
|------------|---------|
| **Astro** | Framework, SSR on Cloudflare |
| **React** | Interactive islands/components |
| **Tailwind CSS** | Styling |
| **TanStack Query** | Data fetching, cache |
| **Nanostores** | Shared state between Astro/React |

### Backend

| Technology | Purpose |
|------------|---------|
| **Astro API Routes** | REST endpoints on Workers |
| **Drizzle ORM** | Type-safe database access |
| **Zod** | Request/response validation |

### External Services

| Service | Purpose |
|---------|---------|
| **Clerk** | Authentication, user management |
| **Resend** | Transactional email delivery |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Astro Pages │  │   React     │  │ Image Compression       │  │
│  │   (SSR)     │  │  Islands    │  │ (client-side, pre-upload)│  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge Network                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Cloudflare Pages                       │    │
│  │              (Astro SSR + API Routes)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │              │              │              │           │
│         ▼              ▼              ▼              ▼           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │    D1     │  │    R2     │  │    KV     │  │  Queues   │    │
│  │ (SQLite)  │  │ (Images)  │  │ (Cache)   │  │  (Async)  │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │    Clerk    │     │   Resend    │     │  Webhooks   │
   │   (Auth)    │     │  (Email)    │     │ (Clerk sync)│
   └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Authentication

### Provider: Clerk

**Rationale:**
- Faster MVP development
- Built-in social logins (Google, Apple, GitHub)
- Pre-built UI components
- Handles auth emails (verification, password reset)
- Free tier covers 10k monthly active users
- Native Astro integration

### User Sync Pattern

Clerk owns authentication. D1 owns app data. Sync via webhook:

```
Clerk                    Worker                   D1
  │                        │                       │
  │── user.created ──────▶│                       │
  │                        │── INSERT user ──────▶│
  │                        │                       │
  │── user.deleted ──────▶│                       │
  │                        │── DELETE cascade ───▶│
  │                        │                       │
```

D1 `users` table stores:
- `clerk_id` (reference to Clerk)
- App-specific preferences
- Relationships (groups, wishlists, claims)

---

## Database

### ORM: Drizzle

**Rationale:**
- Built for edge runtime
- Native D1 support
- Type-safe queries
- Lightweight bundle size
- SQL-like syntax

### Concept-to-Table Mapping

| Concept | Table(s) |
|---------|----------|
| User | `users` |
| Session | Handled by Clerk |
| Invitation | `invitations` |
| Group | `groups`, `group_members` |
| Wishlist | `items` (owner relationship) |
| Tag | `item_recipients` |
| Claim | `claims` |
| Notification | `notifications` |

### Migrations

Managed via Wrangler CLI:

```bash
# Create migration
wrangler d1 migrations create giftlist-db <name>

# Apply locally
wrangler d1 migrations apply giftlist-db

# Apply to production
wrangler d1 migrations apply giftlist-db --remote
```

---

## Image Storage

### Service: Cloudflare R2

**Approach:** Client-side compression + R2 direct upload

```
Browser                    Worker                    R2
   │                         │                        │
   │── compress image ──────▶│                        │
   │   (max 1200px, WebP)    │                        │
   │                         │                        │
   │── request upload URL ──▶│                        │
   │                         │── generate presigned ─▶│
   │◀── presigned URL ───────│   URL                  │
   │                         │                        │
   │── PUT image ────────────────────────────────────▶│
   │                         │                        │
```

**Constraints:**
- Max file size: 5MB (after compression)
- Formats: JPEG, PNG, WebP
- Single image per item (MVP)
- Client converts HEIC → JPEG

**Rationale for client-side compression:**
- Zero extra cost (no Cloudflare Images service)
- Reduces upload time
- Saves R2 storage
- Good enough for gift images

---

## Email

### Service: Resend

**Rationale:**
- Excellent developer experience
- React Email for templates
- Free tier: 3k emails/month
- Simple API

### Email Triggers

| Event | Recipient | Email? |
|-------|-----------|--------|
| Invitation received | Invitee | ✅ |
| Invitation accepted | Inviter | ✅ |
| Item claimed | Other recipients | ❌ (in-app only) |
| Claim released | Original claimer | ✅ |
| Group deleted | Members | ✅ |

**Note:** Claim events never emailed to item owner (preserves surprise).

---

## Notifications

### Strategy: Hybrid

| Type | Delivery | Storage |
|------|----------|---------|
| Immediate | In-app (D1 query) | `notifications` table |
| Async | Cloudflare Queue → Worker | Processed, then D1 |
| Email | Queue → Resend | Not stored |

### Flow

```
Action occurs
     │
     ▼
┌─────────────┐     ┌─────────────┐
│ Sync: write │     │ Async: push │
│ to D1       │     │ to Queue    │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Worker    │
                    │  Consumer   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │ Send Email  │          │ Push notif  │
       │  (Resend)   │          │  (future)   │
       └─────────────┘          └─────────────┘
```

---

## Infrastructure as Code

### Tool: Wrangler

**Rationale:**
- Native to Cloudflare
- Already required for Astro deployment
- Covers all needed resources (D1, R2, KV, Queues)
- Simple TOML configuration
- Built-in migrations support

### Configuration

```toml
# wrangler.toml

name = "giftlist"
compatibility_date = "2024-01-01"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "giftlist-db"
database_id = "xxx"
migrations_dir = "drizzle/migrations"

# R2 Bucket
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "giftlist-images"

# KV Namespace
[[kv_namespaces]]
binding = "CACHE"
id = "xxx"

# Queues
[[queues.producers]]
binding = "NOTIFICATION_QUEUE"
queue = "notifications"

[[queues.consumers]]
queue = "notifications"
max_batch_size = 10

# Environment Variables
[vars]
ENVIRONMENT = "production"

# Secrets (via `wrangler secret put`)
# - CLERK_SECRET_KEY
# - CLERK_WEBHOOK_SECRET
# - RESEND_API_KEY
```

---

## Project Structure

```
giftlist/
├── wrangler.toml              # Cloudflare configuration
├── astro.config.mjs           # Astro configuration
├── tailwind.config.mjs        # Tailwind configuration
├── drizzle.config.ts          # Drizzle configuration
│
├── src/
│   ├── pages/                 # Astro pages + API routes
│   │   ├── index.astro
│   │   ├── wishlist/
│   │   ├── groups/
│   │   └── api/
│   │       ├── items/
│   │       ├── groups/
│   │       ├── claims/
│   │       └── webhooks/
│   │
│   ├── components/            # React components
│   │   ├── ItemCard.tsx
│   │   ├── ClaimButton.tsx
│   │   ├── GroupList.tsx
│   │   └── ...
│   │
│   ├── layouts/               # Astro layouts
│   │
│   ├── lib/                   # Shared utilities
│   │   ├── db/
│   │   │   ├── schema.ts      # Drizzle schema
│   │   │   └── queries.ts     # Query helpers
│   │   ├── auth.ts            # Clerk helpers
│   │   ├── email.ts           # Resend helpers
│   │   └── storage.ts         # R2 helpers
│   │
│   └── stores/                # Nanostores
│
├── drizzle/
│   └── migrations/            # SQL migrations
│
├── public/                    # Static assets
│
└── scripts/
    └── seed.ts                # Development seed data
```

---

## Security Considerations

### Authentication
- All API routes protected by Clerk middleware
- Webhook endpoints verified with Clerk signature

### Authorization
- Row-level security enforced in queries
- User can only access their own wishlists
- User can only see items tagged with their groups/self
- Claims filtered by role (hidden from owner)

### Data Validation
- All inputs validated with Zod schemas
- File uploads validated (type, size)
- SQL injection prevented by Drizzle ORM

### Secrets Management
- Secrets stored via `wrangler secret put`
- Never committed to repository
- Rotatable without redeployment

---

## Cost Estimate

### Free Tier Limits

| Service | Free Allowance | Expected Usage (MVP) |
|---------|----------------|----------------------|
| Clerk | 10k MAU | < 1k |
| D1 Reads | 5M/day | < 100k |
| D1 Writes | 100k/day | < 10k |
| R2 Storage | 10GB | < 1GB |
| R2 Operations | 10M reads/mo | < 100k |
| Workers | 100k req/day | < 50k |
| Queues | 1M ops/mo | < 10k |
| Resend | 3k emails/mo | < 500 |

### Projected Costs

| Stage | Users | Monthly Cost |
|-------|-------|--------------|
| MVP | < 100 | $0 |
| Early Launch | < 1,000 | $0 |
| Growing | < 10,000 | $0 - $20 |
| Scale | 50,000+ | $100 - $150 |

---

## Future Considerations

### Potential Additions
- **Multiple wishlists per user** (Birthday, Christmas, Wedding)
- **Occasion/Event concept** (tie wishlists to dates)
- **Suggestion concept** (others can suggest items)
- **Price tracking** (alert when item goes on sale)
- **Link preview** (fetch product info from URL)

### Scaling Options
- **Real-time updates:** Add Durable Objects + WebSockets
- **Image optimization:** Add Cloudflare Images service
- **Push notifications:** Add web push via Queue workers
- **Self-hosted auth:** Migrate to Lucia if cost becomes issue

---

## References

- [Concept Design Documentation](./APP-COMPOSITION.md)
- [Mermaid Diagrams](./diagrams/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Clerk Astro Integration](https://clerk.com/docs/references/astro/overview)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
