# Landing Page Structure & Copy Design

**Task:** giftlist-sfx.1
**Status:** Design complete - ready for implementation

## Page Structure Overview

```
┌─────────────────────────────────────────────┐
│                   HEADER                    │  (AppLayout provides this)
├─────────────────────────────────────────────┤
│                                             │
│                   HERO                      │  Section 1: Value prop + CTAs
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│               HOW IT WORKS                  │  Section 2: 3-step process
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│                 FEATURES                    │  Section 3: 3 feature cards
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│                   FAQ                       │  Section 4: 5 common questions
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│                FINAL CTA                    │  Section 5: Conversion push
│                                             │
├─────────────────────────────────────────────┤
│                  FOOTER                     │  Simple footer
└─────────────────────────────────────────────┘
```

---

## Section 1: Hero

**Layout:** Centered, single-column on mobile, optional split on desktop
**Background:** Subtle gradient or pattern (use heropatterns.com SVG)

### Copy

**Headline (landing_heroTitle):**
> Share Wishlists with Friends & Family

**Subheadline (landing_heroDescription):**
> Create wishlists, join groups, and coordinate gift-giving without the awkward surprises.

**Primary CTA (landing_getStarted):**
> Get Started

**Secondary CTA (landing_learnMore):**
> Learn More ↓ (scrolls to How It Works)

### Technical Notes
- Use existing i18n messages (already defined)
- Add `motion-safe:` animations for fade-in
- Responsive: `text-4xl sm:text-5xl` for headline
- Container: `container mx-auto px-4 py-24`

---

## Section 2: How It Works

**Layout:** 3-column grid on desktop, stacked on mobile
**Purpose:** Show simplicity of the app in 3 steps

### Copy

**Section Title (landing_howItWorksTitle):** NEW
> How It Works

**Step 1 (landing_step1Title, landing_step1Description):** NEW
> **Create Your Wishlist**
> Add items you want with prices, links, and notes. It takes seconds.

**Step 2 (landing_step2Title, landing_step2Description):** NEW
> **Join or Create Groups**
> Organize with family, friends, or coworkers. Share your list with the right people.

**Step 3 (landing_step3Title, landing_step3Description):** NEW
> **Coordinate Without Spoilers**
> Others claim items secretly. You get what you want without duplicate gifts.

### Icons (Lucide)
- Step 1: `ListPlus` or `Gift`
- Step 2: `Users` or `UserPlus`
- Step 3: `CheckCircle` or `PartyPopper`

### Technical Notes
- Grid: `grid md:grid-cols-3 gap-8`
- Each step: number badge + icon + title + description
- Subtle connecting arrows on desktop (decorative)

---

## Section 3: Features

**Layout:** 3-column grid with cards
**Purpose:** Highlight key differentiating features

### Copy

**Section Title (landing_featuresTitle):** NEW
> Everything You Need

**Feature 1 - Create Wishlists (existing messages):**
- Title (landing_feature1Title): `Create Wishlists`
- Description (landing_feature1Description): `Add items with prices, links, and notes. Share them with specific groups.`
- Icon: `Heart` or `List`

**Feature 2 - Join Groups (existing messages):**
- Title (landing_feature2Title): `Join Groups`
- Description (landing_feature2Description): `Create family or friend groups to share wishlists and coordinate gifts.`
- Icon: `Users`

**Feature 3 - Claim Items (existing messages):**
- Title (landing_feature3Title): `Claim Items`
- Description (landing_feature3Description): `Reserve items so others know what's being purchased. Avoid duplicate gifts.`
- Icon: `ShieldCheck` or `Lock`

### Technical Notes
- Use Card component from shadcn/ui
- Icons with accent color background circles
- Hover states with `motion-safe:` transitions

---

## Section 4: FAQ

**Layout:** Accordion (collapsible)
**Purpose:** Address objections and reduce friction

### Copy

**Section Title (landing_faqTitle):** NEW
> Frequently Asked Questions

**Q1 (landing_faq1Question, landing_faq1Answer):** NEW
> **Is GiftList free to use?**
> Yes! GiftList is completely free. Create unlimited wishlists, join unlimited groups, and invite as many people as you want.

**Q2 (landing_faq2Question, landing_faq2Answer):** NEW
> **Can the wishlist owner see who claimed their items?**
> No! Claims are completely hidden from the wishlist owner. Only other group members can see claims to avoid duplicates.

**Q3 (landing_faq3Question, landing_faq3Answer):** NEW
> **What happens if someone else already claimed an item?**
> You'll see that it's been claimed and can choose a different item. For expensive items, you can contribute a partial amount.

**Q4 (landing_faq4Question, landing_faq4Answer):** NEW
> **Can I share different items with different groups?**
> Absolutely! Each item can be shared with specific groups. Share work-appropriate gifts with coworkers and personal items with family.

**Q5 (landing_faq5Question, landing_faq5Answer):** NEW
> **Do I need to create an account?**
> Yes, a free account is required to create wishlists and join groups. This keeps your lists secure and synced across devices.

### Technical Notes
- Use Accordion from shadcn/ui
- Collapsible with smooth animations
- `motion-safe:` transitions for open/close

---

## Section 5: Final CTA

**Layout:** Centered, highlighted background
**Purpose:** Final conversion push

### Copy

**Headline (landing_ctaTitle):** NEW
> Ready to Start Your Wishlist?

**Subheadline (landing_ctaDescription):** NEW
> Join thousands of families and friends who use GiftList to coordinate gift-giving.

**CTA Button (landing_getStarted):**
> Get Started (reuse existing)

### Technical Notes
- Background: Primary color with subtle pattern
- Large, prominent CTA button
- Optional: "No credit card required" trust badge

---

## Section 6: Footer

**Layout:** Simple, minimal
**Purpose:** Basic links and copyright

### Copy

**Copyright (landing_footerCopyright):** NEW
> © 2025 GiftList. All rights reserved.

**Links:**
- Privacy Policy (future)
- Terms of Service (future)
- Contact (future)

### Technical Notes
- Simple flex layout
- `text-muted-foreground text-sm`
- Can be minimal for MVP

---

## New i18n Messages Required

Add these to `/messages/en.json`:

```json
{
  "landing_howItWorksTitle": "How It Works",
  "landing_step1Title": "Create Your Wishlist",
  "landing_step1Description": "Add items you want with prices, links, and notes. It takes seconds.",
  "landing_step2Title": "Join or Create Groups",
  "landing_step2Description": "Organize with family, friends, or coworkers. Share your list with the right people.",
  "landing_step3Title": "Coordinate Without Spoilers",
  "landing_step3Description": "Others claim items secretly. You get what you want without duplicate gifts.",

  "landing_featuresTitle": "Everything You Need",

  "landing_faqTitle": "Frequently Asked Questions",
  "landing_faq1Question": "Is GiftList free to use?",
  "landing_faq1Answer": "Yes! GiftList is completely free. Create unlimited wishlists, join unlimited groups, and invite as many people as you want.",
  "landing_faq2Question": "Can the wishlist owner see who claimed their items?",
  "landing_faq2Answer": "No! Claims are completely hidden from the wishlist owner. Only other group members can see claims to avoid duplicates.",
  "landing_faq3Question": "What happens if someone else already claimed an item?",
  "landing_faq3Answer": "You'll see that it's been claimed and can choose a different item. For expensive items, you can contribute a partial amount.",
  "landing_faq4Question": "Can I share different items with different groups?",
  "landing_faq4Answer": "Absolutely! Each item can be shared with specific groups. Share work-appropriate gifts with coworkers and personal items with family.",
  "landing_faq5Question": "Do I need to create an account?",
  "landing_faq5Answer": "Yes, a free account is required to create wishlists and join groups. This keeps your lists secure and synced across devices.",

  "landing_ctaTitle": "Ready to Start Your Wishlist?",
  "landing_ctaDescription": "Join thousands of families and friends who use GiftList to coordinate gift-giving.",

  "landing_footerCopyright": "© 2025 GiftList. All rights reserved."
}
```

---

## Implementation Notes for giftlist-sfx.2 (Hero) and giftlist-sfx.3 (Features)

### For Hero Implementation (giftlist-sfx.2):
1. Keep current hero structure but add CTAs
2. Add subtle background pattern from heropatterns.com
3. Use Button component from shadcn/ui
4. Primary button links to `/wishlist` (or sign-up flow)
5. Secondary button scrolls to How It Works section

### For Features Implementation (giftlist-sfx.3):
1. Implement How It Works + Features sections
2. Use Card components with icons
3. Use Accordion for FAQ
4. Add Final CTA section
5. Add minimal footer

### Responsive Breakpoints:
- Mobile: Single column, stacked sections
- Tablet (md): 2-column grids where appropriate
- Desktop (lg): Full 3-column layouts

### Animations:
- `motion-safe:animate-fade-in` for sections on scroll
- `motion-safe:hover:scale-105` for cards
- Use Intersection Observer or native CSS for scroll animations
