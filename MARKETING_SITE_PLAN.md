# SearchFindr Marketing Site - Component Structure & File Plan

## 📁 File Structure

```
app/
├── (marketing)/                    # Marketing route group (public pages)
│   ├── layout.tsx                  # Marketing layout with nav/footer
│   ├── page.tsx                    # Homepage (hero → features → pricing teaser → CTA)
│   ├── pricing/
│   │   └── page.tsx                # Pricing page with early bird offer
│   ├── sample-output/
│   │   └── page.tsx                # Interactive sample output showcase
│   ├── demo/
│   │   └── page.tsx                # Demo booking with Calendly embed
│   ├── compare/
│   │   └── page.tsx                # Comparison vs DealSage
│   ├── privacy/
│   │   └── page.tsx                # Privacy policy
│   └── terms/
│       └── page.tsx                # Terms of service
│
├── (dashboard)/                    # Existing app (unchanged)
│   └── ...
│
├── login/                          # Move current app/page.tsx here
│   └── page.tsx                    # Login page (existing auth flow)
│
└── page.tsx                        # Redirect to marketing homepage

components/
├── marketing/
│   ├── Navigation.tsx              # Sticky nav with logo, links, CTAs
│   ├── Footer.tsx                  # Footer with links and social
│   ├── Hero.tsx                    # Hero section component
│   ├── SocialProof.tsx             # Trust badges section
│   ├── ProblemSection.tsx          # Pain points cards
│   ├── SolutionSection.tsx         # 3-step process
│   ├── FeaturesGrid.tsx            # 6 feature cards
│   ├── VisualDemo.tsx              # Screenshot/mockup showcase
│   ├── PricingTeaser.tsx           # Early bird pricing CTA
│   ├── FinalCTA.tsx                # Bottom CTA section
│   ├── PricingCard.tsx             # Reusable pricing card
│   ├── ComparisonTable.tsx          # Comparison table component
│   └── EarlyBirdBadge.tsx          # Urgency badge component
│
└── Navigation.tsx                  # Existing dashboard nav (unchanged)
```

## 🎨 Design System

### Colors
- **Primary Green**: `#10b981` (emerald-500)
- **Primary Dark**: `#059669` (emerald-600)
- **Accent Cyan**: `#06b6d4` (cyan-500)
- **Background Dark**: `#0a0e14` to `#1a1f28`
- **Surface**: `rgba(255, 255, 255, 0.05)` to `rgba(255, 255, 255, 0.08)`
- **Border**: `rgba(255, 255, 255, 0.1)`
- **Text Primary**: `#ffffff`
- **Text Secondary**: `rgba(255, 255, 255, 0.7)`
- **Text Muted**: `rgba(255, 255, 255, 0.5)`

### Typography
- **Headings**: Bold, tight letter-spacing (-0.02em to -0.03em)
- **Body**: Line-height 1.6-1.8, readable sizes (16px+)
- **Scale**: 48px (h1), 36px (h2), 24px (h3), 18px (h4), 16px (body)

### Spacing Scale
- 8px, 16px, 24px, 32px, 48px, 64px, 96px, 128px

### Components

#### Buttons
- **Primary**: Solid emerald-500, hover: emerald-400, padding: 12-16px
- **Secondary**: Outline, transparent bg, hover: subtle fill
- **Text**: Underline on hover, subtle color change

#### Cards
- Border: 1px, `rgba(255, 255, 255, 0.1)`
- Background: `rgba(255, 255, 255, 0.05)`
- Border-radius: 12-16px
- Shadow: Subtle glow on hover
- Padding: 24-32px

#### Gradients
- Hero background: Radial gradient from emerald-500/20 to transparent
- Accent gradients: Linear 135deg from emerald-500 to cyan-500
- Subtle, not loud

## 📄 Page Breakdowns

### 1. Homepage (`app/(marketing)/page.tsx`)
**Sections (in order):**
1. Hero (Hero.tsx)
2. Social Proof (SocialProof.tsx)
3. Problem (ProblemSection.tsx)
4. Solution (SolutionSection.tsx)
5. Features (FeaturesGrid.tsx)
6. Visual Demo (VisualDemo.tsx)
7. Pricing Teaser (PricingTeaser.tsx)
8. Final CTA (FinalCTA.tsx)

### 2. Pricing Page (`app/(marketing)/pricing/page.tsx`)
- Hero with urgency badge
- Early Bird Card (highlighted, glowing)
- Standard Pricing Cards (Pro, Unlimited)
- Comparison Table
- FAQ Section
- Final CTA

### 3. Sample Output Page (`app/(marketing)/sample-output/page.tsx`)
- Hero
- Interactive mockup (screenshot with annotations)
- Component explanations
- CTA to book demo

### 4. Demo Page (`app/(marketing)/demo/page.tsx`)
- Hero
- "What you'll see" bullets
- Calendly embed
- Pricing note

### 5. Compare Page (`app/(marketing)/compare/page.tsx`)
- Hero
- Comparison table (SearchFindr vs DealSage)
- Bottom line statement
- CTA

### 6. Privacy & Terms
- Simple legal pages
- Clean typography
- Match marketing design

## 🔧 Technical Implementation

### Layout (`app/(marketing)/layout.tsx`)
- Dark theme background
- Marketing Navigation (sticky)
- Footer
- Smooth scroll behavior
- Auth check: redirect logged-in users to `/dashboard`

### Navigation (`components/marketing/Navigation.tsx`)
- Logo: "SEARCHFINDR" (left)
- Links: Features (scroll), Sample Output, Pricing, Compare
- Right: "Log In" + "Book Demo" (primary)
- Sticky with backdrop blur
- Mobile hamburger menu

### Footer (`components/marketing/Footer.tsx`)
- 3 columns: Product | Company | Legal
- Social links (LinkedIn)
- Copyright

### Animations
- Intersection Observer for fade-in on scroll
- Hover states: subtle lift + glow
- Gradient animations (CSS keyframes)
- Smooth transitions (150-300ms)

### Responsive Breakpoints
- Mobile: 375px (stack everything)
- Tablet: 768px (2 columns)
- Desktop: 1024px (full layout)
- Large: 1440px (max-width container)

## 🚀 Build Order

1. ✅ **File Structure** (this plan)
2. **Marketing Layout** - Set up route group and layout
3. **Navigation Component** - Sticky nav with mobile menu
4. **Footer Component** - Footer with links
5. **Homepage Sections** (one by one):
   - Hero
   - Social Proof
   - Problem
   - Solution
   - Features
   - Visual Demo
   - Pricing Teaser
   - Final CTA
6. **Other Pages**:
   - Pricing
   - Sample Output
   - Demo
   - Compare
   - Privacy & Terms
7. **Polish**:
   - Animations
   - Hover states
   - Responsive tweaks
   - Performance optimization

## 📝 Notes

- Use `lucide-react` for all icons
- Use `next/image` for any images
- Use `next/script` for Calendly embed
- Stripe payment link: `https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00`
- Calendly URL: `https://calendly.com/gio-searchfindr/15min?hide_gdpr_banner=1&primary_color=10b981`
- All CTAs should have loading states
- Mobile-first responsive design
- WCAG AA contrast minimum
