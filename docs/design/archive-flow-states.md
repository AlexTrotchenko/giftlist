# Archive Flow: States and Transitions Design

This document defines the item lifecycle states for the giftlist application, including state transitions and permissions.

## Overview

Items in a gift wishlist follow a lifecycle from creation through claiming, purchasing, and eventual archival. This design extends the current claims-based model with explicit item states to support the full gift-giving cycle.

## States

### Item States

| State | Description | Visible to Owner | Visible to Recipients |
|-------|-------------|------------------|----------------------|
| **active** | Default state, item is on the wishlist | Yes | Yes |
| **received** | Owner confirmed they received the gift | Yes | Yes (shows "Gifted") |
| **archived** | Completed/fulfilled, hidden from active list | Yes (in archive view) | No |

### Claim States (existing, on claims table)

| State | Description | Triggered By |
|-------|-------------|--------------|
| **claimed** | Item reserved by a gift-giver | Gift-giver |
| **purchased** | Gift-giver confirmed purchase | Gift-giver |
| **expired** | Claim auto-released after 30 days | System |

## State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ITEM LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐                                                       │
│   │  active  │◄──────────────────────────────────────┐              │
│   └────┬─────┘                                        │              │
│        │                                              │              │
│        │ owner confirms receipt                       │ owner        │
│        ▼                                              │ reactivates  │
│   ┌──────────┐                                        │              │
│   │ received │────────────────────────────────────────┤              │
│   └────┬─────┘                                        │              │
│        │                                              │              │
│        │ owner archives                               │              │
│        ▼                                              │              │
│   ┌──────────┐                                        │              │
│   │ archived │────────────────────────────────────────┘              │
│   └──────────┘                                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         CLAIM LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌───────────┐      gift-giver       ┌───────────┐                 │
│   │ unclaimed │─────────claims───────►│  claimed  │                 │
│   └───────────┘                       └─────┬─────┘                 │
│        ▲                                    │                        │
│        │                                    │ gift-giver             │
│        │ gift-giver                         │ marks purchased        │
│        │ releases                           ▼                        │
│        │                              ┌───────────┐                  │
│        │                              │ purchased │                  │
│        │                              └───────────┘                  │
│        │                                                             │
│        │ system (30 days)                                            │
│   ┌────┴─────┐                                                       │
│   │ expired  │                                                       │
│   └──────────┘                                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## State Transitions

### Item State Transitions

| From | To | Triggered By | Conditions | Action |
|------|-----|--------------|------------|--------|
| active | received | Owner | Item has purchased claim OR owner manually marks | Notify claimer(s) of receipt confirmation |
| received | archived | Owner | None | Move to archive, hide from recipients |
| archived | active | Owner | None | Restore to wishlist |
| active | archived | Owner | No active claims | Direct archive without receipt (e.g., bought it themselves) |

### Claim State Transitions

| From | To | Triggered By | Conditions | Action |
|------|-----|--------------|------------|--------|
| unclaimed | claimed | Gift-giver | User is recipient, not owner; no existing full claim | Create claim record, notify other recipients |
| claimed | purchased | Gift-giver | User owns the claim | Update claim, notify other recipients |
| claimed | unclaimed | Gift-giver | User owns the claim | Delete claim, notify other recipients |
| claimed | expired | System | 30 days elapsed | Delete claim, notify claimer + other recipients |
| purchased | unclaimed | Gift-giver | User owns the claim | Delete claim (rare: changed mind after purchase) |

## Permissions Matrix

### Who Can Trigger What

| Action | Owner | Gift-giver (claimer) | Other Recipients |
|--------|-------|---------------------|------------------|
| Create claim | No | Yes | Yes |
| Release own claim | N/A | Yes | N/A |
| Mark claim purchased | N/A | Yes | N/A |
| Mark item received | Yes | No | No |
| Archive item | Yes | No | No |
| Restore from archive | Yes | No | No |
| Delete item | Yes | No | No |

### Visibility Rules

| Data | Owner Sees | Claimer Sees | Other Recipients See |
|------|------------|--------------|---------------------|
| Item details | Full | Full | Full |
| Claim exists | **No** (surprise!) | Own claim details | "Reserved" badge |
| Claim amount (partial) | **No** | Own amount | Remaining claimable |
| Claimer identity | **No** | N/A | Claimer name/avatar |
| Purchased status | **No** | Own purchase status | "Purchased" badge |
| Received status | Full | Full | "Gifted" badge |
| Archived items | Full (separate view) | Hidden | Hidden |

## Database Changes

### Option A: Add status column to items table (Recommended)

```sql
ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'received', 'archived'));
```

### Option B: Add purchased flag to claims table

```sql
ALTER TABLE claims ADD COLUMN purchased_at INTEGER;
-- purchased_at != null means purchased
```

**Recommendation**: Implement both changes:
1. Add `status` to items for item-level lifecycle
2. Add `purchased_at` to claims for purchase tracking

## API Changes

### New Endpoints

```
POST /api/items/[id]/receive    # Owner marks item as received
POST /api/items/[id]/archive    # Owner archives item
POST /api/items/[id]/restore    # Owner restores from archive
POST /api/claims/[id]/purchase  # Gift-giver marks as purchased
```

### Modified Endpoints

```
GET /api/items                  # Add ?status=active|received|archived filter
GET /api/shared-items           # Exclude archived items by default
```

## UI Changes

### Owner View

1. **Wishlist page**: Show active items, with "received" badge on confirmed items
2. **Archive section**: Separate tab/page for archived items
3. **Item actions**: "Mark as received" button (when has purchased claims), "Archive" button

### Recipient View

1. **Shared items**: Show claim status badges (Reserved, Purchased, Gifted)
2. **Claim dialog**: Add "Mark as purchased" checkbox/button after claiming
3. **My claims**: Show purchase status on claimed items

## Notification Events

| Event | Notify |
|-------|--------|
| Claim marked purchased | Other recipients |
| Item marked received | Claimer(s) |
| Item archived | No one |
| Item restored | No one (unless re-shared) |

## Edge Cases

### Item deleted while claimed
- Current behavior: Notify claimers, cascade delete claims
- No change needed

### Claim expires on purchased item
- Purchased claims should NOT expire (extend or remove expiration)
- Alternative: Longer expiration (90 days) for purchased claims

### Partial claims and purchase
- Each partial claimer can independently mark their portion as purchased
- Item "received" when owner confirms (regardless of purchase status)

### Group gifts
- Multiple partial claims can each be marked purchased
- Owner sees single "received" action for the whole item

## Migration Strategy

1. Add `status` column with default 'active' (non-breaking)
2. Add `purchased_at` column to claims (non-breaking)
3. Deploy new endpoints
4. Update UI incrementally
5. No data migration needed - all existing items start as 'active'

## Future Considerations

- **Soft delete**: Could use `archived` status instead of hard delete
- **Return handling**: Purchased → back to claimed if returned
- **Thank you notes**: Integration after "received" confirmation
- **Analytics**: Track time-to-purchase, fulfillment rates
