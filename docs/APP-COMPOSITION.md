# Gift List App - Complete Concept Design

A concept design document following Daniel Jackson's *Essence of Software* methodology.

## Overview

This app allows users to:
- Create a wishlist of desired gifts
- Tag items with recipients (groups or individuals) to share them
- Claim items to prevent duplicate gifts (hidden from the list owner)
- Manage groups for easy sharing

---

## Concepts

### 1. User

```
concept User
  purpose: establish identity for personalized experience
  
  state:
    users: set User
    profile: User → (name: String, email: Email, avatar: Image)
    
  actions:
    register (gen u: User, email: Email, name: String)
      when email not in profiles
      add u to users
      set profile[u] = (name, email, null)
      
    updateProfile (u: User, name: String, avatar: Image)
      when u in users
      set profile[u] = (name, profile[u].email, avatar)
      
    delete (u: User)
      when u in users
      remove u from users
      remove u from profile
      
  operational principle:
    after register(u, email, name), u in users and profile[u].email = email
```

### 2. Session

```
concept Session [User]
  purpose: sustained interaction without repeated authentication
  
  state:
    sessions: Session → User
    active: set Session
    
  actions:
    login (u: User, credentials: Credentials, gen s: Session)
      when valid(credentials, u)
      set sessions[s] = u
      add s to active
      
    logout (s: Session)
      when s in active
      remove s from active
      
    expire (s: Session)
      when s in active
      remove s from active
      
    logoutAll (u: User)
      for s where sessions[s] = u:
        remove s from active
      
  operational principle:
    after login(u, creds, s), s in active and sessions[s] = u
    after login(u, creds, s) then logout(s), s not in active
```

### 3. Invitation

```
concept Invitation [User, Group]
  purpose: controlled group membership through explicit consent
  
  state:
    pending: set (Group × User × User)  // (group, inviter, invitee)
    
  actions:
    invite (g: Group, from: User, to: User)
      when (g, _, to) not in pending
      add (g, from, to) to pending
      
    accept (g: Group, u: User)
      when exists (g, _, u) in pending
      remove (g, _, u) from pending
      
    decline (g: Group, u: User)
      when exists (g, _, u) in pending
      remove (g, _, u) from pending
      
    revoke (g: Group, from: User, to: User)
      when (g, from, to) in pending
      remove (g, from, to) from pending
      
    revokeAll (u: User)
      remove all (_, u, _) from pending
      remove all (_, _, u) from pending
      
    revokeAllForGroup (g: Group)
      remove all (g, _, _) from pending
      
  operational principle:
    after invite(g, from, to) then accept(g, to), to can join g
    after invite(g, from, to) then decline(g, to), to not in g
```

### 4. Group

```
concept Group [User]
  purpose: bundle users for collective operations
  
  state:
    groups: set Group
    members: Group → set User
    name: Group → String
    
  actions:
    create (creator: User, gen g: Group, n: String)
      add g to groups
      set name[g] = n
      set members[g] = {creator}
      
    addMember (g: Group, u: User)
      when g in groups and u not in members[g]
      add u to members[g]
      
    removeMember (g: Group, u: User)
      when u in members[g]
      remove u from members[g]
      
    removeFromAll (u: User)
      for g where u in members[g]:
        remove u from members[g]
        
    delete (g: Group)
      when g in groups
      remove g from groups
      remove g from members
      remove g from name
      
  operational principle:
    after create(u, g, n) then addMember(g, u2), u2 in members[g]
    after addMember(g, u) then removeMember(g, u), u not in members[g]
```

### 5. Wishlist

```
concept Wishlist [User, Item]
  purpose: let someone express what gifts they want

  state:
    items: User → set Item
    details: Item → (name: String, link: URL, price: Money, notes: String)
    owner: Item → User
    status: Item → Status  // active | received | archived

  types:
    Status = active | received | archived

  actions:
    add (o: User, gen i: Item, d: Details)
      add i to items[o]
      set details[i] = d
      set owner[i] = o
      set status[i] = active

    update (o: User, i: Item, d: Details)
      when i in items[o]
      set details[i] = d

    remove (o: User, i: Item)
      when i in items[o]
      remove i from items[o]
      remove i from details
      remove i from owner
      remove i from status

    receive (o: User, i: Item)
      when i in items[o] and status[i] = active
      set status[i] = received

    archive (o: User, i: Item)
      when i in items[o] and status[i] in {active, received}
      when status[i] = active implies no active claims on i
      set status[i] = archived

    restore (o: User, i: Item)
      when i in items[o] and status[i] in {received, archived}
      set status[i] = active

    deleteAll (u: User)
      for i in items[u]:
        remove(u, i)

  operational principle:
    after add(o, i, d), i in items[o] and status[i] = active
    after receive(o, i), status[i] = received
    after archive(o, i), status[i] = archived (hidden from recipients)
    after restore(o, i), status[i] = active (visible again)

  visibility:
    forRecipientOf(i): status[i] = archived implies i is HIDDEN
```

### 6. Tag

```
concept Tag [Item, Recipient]
  purpose: control who can see which items
  
  state:
    tags: Item → set Recipient
    
  actions:
    affix (i: Item, r: Recipient)
      add r to tags[i]
      
    detach (i: Item, r: Recipient)
      when r in tags[i]
      remove r from tags[i]
      
    clear (i: Item)
      set tags[i] = {}
      
    find (r: Recipient): set Item
      return {i | r in tags[i]}
      
  operational principle:
    after affix(i, r), find(r) includes i
    after affix(i, r) then detach(i, r), find(r) excludes i
```

### 7. Claim

```
concept Claim [Item, User]
  purpose: prevent duplicate gifts by reserving items

  state:
    claims: Item → User
    purchasedAt: Item → DateTime?  // null = not purchased, timestamp = purchased

  actions:
    claim (i: Item, u: User)
      when i not in domain(claims)
      set claims[i] = u
      set purchasedAt[i] = null

    unclaim (i: Item, u: User)
      when claims[i] = u
      remove i from claims
      remove i from purchasedAt

    markPurchased (i: Item, u: User)
      when claims[i] = u and purchasedAt[i] = null
      set purchasedAt[i] = now()

    unmarkPurchased (i: Item, u: User)
      when claims[i] = u and purchasedAt[i] ≠ null
      set purchasedAt[i] = null

    release (i: Item)
      when i in domain(claims)
      remove i from claims
      remove i from purchasedAt

    releaseAll (u: User)
      for i where claims[i] = u:
        remove i from claims
        remove i from purchasedAt

  operational principle:
    after claim(i, u1), cannot claim(i, u2) where u1 ≠ u2
    after claim(i, u) then unclaim(i, u), can claim(i, u2)
    after markPurchased(i, u), purchasedAt[i] ≠ null
    after unmarkPurchased(i, u), purchasedAt[i] = null

  visibility:
    forOwnerOf(i): claims[i] is HIDDEN, purchasedAt[i] is HIDDEN
    forRecipientOf(i): claims[i] is VISIBLE, purchasedAt[i] is VISIBLE
```

### 8. Notification

```
concept Notification [User]
  purpose: inform users of state changes they didn't initiate
  
  state:
    inbox: User → set (Message × DateTime × Boolean)  // message, time, read
    
  actions:
    send (to: User, gen m: Message)
      add (m, now(), false) to inbox[to]
      
    markRead (u: User, m: Message)
      when (m, _, false) in inbox[u]
      update to (m, _, true)
      
    clear (u: User)
      set inbox[u] = {}
      
  operational principle:
    after send(u, m), m in inbox[u]
```

---

## App Composition

```
app GiftList
  include 
    User,
    Session<User>,
    Invitation<User, Group>,
    Group<User>,
    Wishlist<User, Item>,
    Tag<Item, Recipient>,
    Claim<Item, User>,
    Notification<User>
    
  types:
    Recipient = User | Group
```

---

## Synchronization Rules

### Invitation Flow

```
sync Invitation.invite(g, from, to)
  Notification.send(to, from.name + " invited you to " + g.name)

sync Invitation.accept(g, u)
  Group.addMember(g, u)
  for member in Group.members(g):
    Notification.send(member, u.name + " joined " + g.name)
```

### Item Deletion Cascade

```
sync Wishlist.remove(owner, i)
  let claimer = Claim.claims[i]
  Tag.clear(i)
  Claim.release(i)
  if claimer exists:
    Notification.send(claimer, owner.name + " removed an item you claimed")
```

### Group Deletion Cascade

```
sync Group.delete(g)
  // Clean up tags
  for i in Tag.find(g):
    Tag.detach(i, g)
    
  // Release claims and notify
  for u in Group.members(g):
    for i where Claim.claims[i] = u and g in Tag.tags[i]:
      Claim.release(i)
      Notification.send(u, "Your claim was released: group deleted")
      
  // Cancel invitations
  Invitation.revokeAllForGroup(g)
  
  // Notify affected item owners
  for owner in affectedOwners:
    Notification.send(owner, g.name + " was deleted. Some items lost that tag.")
```

### User Deletion Cascade

```
sync User.delete(u)
  Session.logoutAll(u)
  Wishlist.deleteAll(u)
  Group.removeFromAll(u)
  Invitation.revokeAll(u)
  Claim.releaseAll(u)
  Notification.clear(u)
```

### Membership Changes

```
sync Group.removeMember(g, u)
  // Release claims made via this group
  for i where Claim.claims[i] = u and g in Tag.tags[i]:
    Claim.release(i)
    Notification.send(u, "Claim released: you left " + g.name)

sync Group.addMember(g, u)
  // If new member owns items tagged with this group, unshare them
  for i in Wishlist.items[u] where g in Tag.tags[i]:
    Tag.detach(i, g)
    Claim.release(i)
    Notification.send(u, "Items unshared: you joined " + g.name)
```

### Tag Changes

```
sync Tag.detach(i, r)
  // If the recipient being removed was the claimer, release
  let claimer = Claim.claims[i]
  if claimer exists and claimer accessed via r:
    Claim.release(i)
    Notification.send(claimer, "You no longer have access to claimed item")
```

### Constraint Enforcement

```
sync Tag.affix(i, r)
  // Block if owner is tagging with self or own group
  let owner = Wishlist.owner[i]
  when r ≠ owner
  when r is Group implies owner not in Group.members(r)
  // else: action blocked
```

### Item Lifecycle Events

```
sync Wishlist.receive(o, i)
  // Notify all claimers that the item was received
  for u where Claim.claims[i] = u:
    Notification.send(u, o.name + " confirmed they received " + i.name)

sync Wishlist.archive(o, i)
  // No notifications - archive is a private owner action
  // Item becomes hidden from recipients via visibility rules

sync Wishlist.restore(o, i)
  // No notifications - restore is a private owner action
  // Item becomes visible to recipients again via visibility rules
```

### Claim Purchase Events

```
sync Claim.markPurchased(i, u)
  // Notify other recipients (not the owner!) that item was purchased
  for r in Tag.tags[i]:
    for member in recipients(r) where member ≠ u and member ≠ Wishlist.owner[i]:
      Notification.send(member, u.name + " purchased " + i.name)

sync Claim.unmarkPurchased(i, u)
  // No notification for unmark - rare edge case
```

---

## Visibility Rules

### Item Visibility

| Viewer | Condition | Sees |
|--------|-----------|------|
| Owner | Always | Details, tags, edit controls, status |
| Owner | Always | NOT claims |
| Owner | status = archived | Item in archive view only |
| Recipient | Tagged, status = active | Details, claim status, claimer |
| Recipient | Tagged, status = received | Details with "Gifted" badge |
| Recipient | Tagged, status = archived | Nothing (hidden) |
| Other | Not tagged | Nothing |

### Claim Visibility

| Viewer | Sees Claim Exists | Sees Claimer Identity | Sees Purchase Status |
|--------|-------------------|----------------------|----------------------|
| Item Owner | No | No | No |
| Claimer | Yes (own) | Yes (self) | Yes (own) |
| Other Recipient | Yes | Yes | Yes ("Purchased" badge) |
| Non-Recipient | N/A | N/A | N/A |

### Group Visibility

| Viewer | Condition | Sees |
|--------|-----------|------|
| Member | In group | Name, members, invite control |
| Non-member | Not in group | Nothing |

---

## Integrity Verification

### Operational Principles After Composition

| Concept | Principle | Holds? | Notes |
|---------|-----------|--------|-------|
| User | register → user exists | ✅ | No sync interferes |
| Session | login → active session | ✅ | No sync interferes |
| Invitation | invite+accept → member | ✅ | Sync adds member correctly |
| Group | addMember → in members | ✅ | Sync may trigger cleanup but doesn't break |
| Wishlist | add → item exists, status = active | ✅ | No sync interferes with add |
| Wishlist | receive → status = received | ✅ | Sync sends notifications only |
| Wishlist | archive → status = archived | ✅ | Precondition blocks if active claims exist |
| Wishlist | restore → status = active | ✅ | No sync interferes |
| Tag | affix → find includes | ✅ | Sync may block affix but doesn't break it |
| Claim | claim → locked | ✅ | Release is explicit action, not corruption |
| Claim | markPurchased → purchasedAt set | ✅ | Sync sends notifications only |
| Notification | send → in inbox | ✅ | No sync interferes |

### Constraint Verification

| Constraint | Enforced By |
|------------|-------------|
| Owner can't tag with self | Sync blocks Tag.affix |
| Owner can't tag with own group | Sync blocks Tag.affix |
| One claim per item | Claim.claim precondition |
| Owner can't see claims | Visibility rule on Claim |
| Claims released on access loss | Multiple syncs on Group/Tag changes |
| Active items with claims can't be archived | Wishlist.archive precondition |
| Archived items hidden from recipients | Visibility rule on Wishlist |

---

## Diagrams

See `diagrams/` folder:

| File | Description |
|------|-------------|
| `00-concept-overview.mmd` | All concepts and relationships |
| `01-user-lifecycle.mmd` | User states |
| `02-item-lifecycle.mmd` | Active → Received → Archived lifecycle |
| `03-invitation-lifecycle.mmd` | Pending → Accepted/Declined |
| `04-claim-lifecycle.mmd` | Unclaimed → Claimed → Purchased |
| `05-group-membership.mmd` | Join/leave effects |
| `06-sync-rules.mmd` | Cascade effects |
| `07-visibility-rules.mmd` | What each role sees |
| `08-notifications.mmd` | Event → notification mapping |

---

## Design Decisions

### Why Tag Instead of Wishlist?

We separated Tag from Wishlist because:
1. Tagging is a reusable concept (could apply to other things)
2. Visibility control is distinct from item ownership
3. Clearer separation of concerns

### Why Recipient = User | Group?

Allows flexible sharing:
- Direct sharing with individuals
- Bulk sharing with groups
- Mix of both on same item

### Why Release vs Unclaim?

- `unclaim`: claimer voluntarily gives up claim
- `release`: system removes claim due to access change

Both are Claim actions, preserving integrity. Release handles edge cases without breaking the operational principle.

### Why Block Owner from Own Groups?

Prevents seeing claims on own items through group membership. Alternative: auto-unshare (which we chose via sync).
