# Responsive Design Implementation

## Overview
This document details the responsive design changes made to Ashbee Realms to support mobile and tablet devices.

## Breakpoints
The game uses Tailwind CSS responsive breakpoints:
- **Mobile**: < 640px (default)
- **Tablet**: 640px - 1024px (sm: and md:)
- **Desktop**: > 1024px (lg: and above)

## Key Changes

### 1. Mobile Navigation
- **Hamburger Menu**: Added a menu button in the header (mobile only)
- **Slide-out Sidebar**: Sidebar slides in from the left on mobile as an overlay
- **Touch-friendly**: All navigation items have proper touch targets (min 44px)

### 2. Layout Adaptations

#### Sidebar (Sidebar.jsx)
- **Desktop**: Fixed 80px width, icon-only navigation
- **Mobile/Tablet**: 256px full menu with text labels, hidden by default
- **State Management**: Global mobile menu state in gameStore

#### Header (Header.jsx)
- **Desktop**: Horizontal layout with full stats bars
- **Mobile**: 
  - Stats bars hidden (shown in character sheet instead)
  - Hamburger menu button visible
  - Reduced padding and font sizes
  - Gold display remains visible but scaled down

#### Main Content (App.jsx)
- **Responsive Padding**: 12px (mobile) → 16px (sm) → 24px (md+)
- **Overflow Handling**: Proper min-w-0 for text truncation

### 3. Component Responsive Updates

#### CharacterSheet
- **Layout**: Stacks vertically on mobile
- **Stats Grid**: 1 column → 2 columns (sm) → 3 columns (lg)
- **Font Sizes**: Scaled from base to lg/xl/2xl based on screen size

#### CombatView
- **Combatants**: Stack vertically on mobile, side-by-side on desktop
- **Action Buttons**: 2×2 grid on mobile, 1×4 on desktop
- **Touch Targets**: Minimum 60px height for easy tapping
- **Combat Log**: Reduced height on mobile for better space usage

#### Inventory
- **Item Grid**: 3 columns (mobile) → 4 (sm) → 5 (md) → 4 (lg)
- **Filters**: Flex-wrap for mobile, allowing buttons to stack
- **Header**: Stacks vertically on small screens

#### MapView
- **Location Grid**: Single column on mobile, 2 columns on tablet+
- **Touch Feedback**: Active:scale-95 for better touch response

#### QuestLog
- **Tabs**: Full width buttons on mobile with flex-1
- **Quest Cards**: Single column layout on mobile

#### AchievementTracker
- **Grid**: 1 column (mobile) → 2 (sm) → 3 (lg)
- **Progress Bars**: Scaled heights for mobile

#### Modals (DialogueModal, SettingsModal)
- **Padding**: Reduced from 32px to 16px on mobile
- **Overflow**: Proper scrolling for tall content
- **Close Buttons**: Positioned responsively

### 4. Touch Optimizations

#### CSS Changes (index.css)
```css
.btn {
  min-height: 44px; /* Apple's recommended minimum touch target */
  touch-action: manipulation; /* Prevents touch delays */
}
```

#### Interactive Elements
- All buttons meet 44px minimum touch target size
- Active states for visual feedback on mobile
- Proper spacing between touch targets (min 8px)

### 5. Typography Scaling
- **Headings**: text-2xl (mobile) → text-3xl (sm) → text-4xl (lg)
- **Body Text**: text-sm (mobile) → text-base (sm)
- **Icons**: 20px (mobile) → 24px (sm) → 32px (lg)

## Testing Recommendations

### Browser DevTools
1. Open Chrome/Firefox DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test these device profiles:
   - iPhone SE (375px)
   - iPhone 12/13 Pro (390px)
   - iPad (768px)
   - iPad Pro (1024px)

### Real Device Testing
- Test on actual iOS and Android devices
- Verify touch interactions feel natural
- Check text readability at arm's length
- Ensure buttons are easily tappable

### Key Features to Test
1. ✅ Mobile menu opens/closes smoothly
2. ✅ All tabs/buttons are easily tappable
3. ✅ Content doesn't overflow horizontally
4. ✅ Text is readable without zooming
5. ✅ Combat actions work well with touch
6. ✅ Modals display properly on small screens
7. ✅ Forms and inputs are usable

## Performance Considerations

### Optimizations Applied
- CSS transitions use transform (GPU accelerated)
- touch-action: manipulation reduces 300ms tap delay
- Minimal re-renders with proper React state management

### Future Improvements
- Consider lazy loading for modal components
- Optimize images if added in the future
- Add service worker for offline support

## Browser Support
- Modern mobile browsers (iOS Safari 12+, Chrome Mobile 80+)
- Responsive design tested on latest versions
- CSS Grid and Flexbox widely supported

## Maintenance Notes

### Adding New Components
When creating new components:
1. Start with mobile-first design
2. Use responsive Tailwind classes (sm:, md:, lg:)
3. Ensure touch targets meet 44px minimum
4. Test on multiple screen sizes
5. Add touch-action: manipulation for interactive elements

### Common Patterns
```jsx
// Responsive padding
className="p-3 sm:p-4 md:p-6"

// Responsive grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"

// Responsive text
className="text-sm sm:text-base md:text-lg"

// Hide on mobile, show on desktop
className="hidden lg:block"

// Touch-friendly button
className="min-h-[44px] touch-manipulation"
```

## Accessibility
- Proper ARIA labels for navigation
- Keyboard navigation still works
- Focus states visible on all interactive elements
- Semantic HTML maintained throughout

## Files Modified
- public/src/App.jsx
- public/src/components/Layout/Sidebar.jsx
- public/src/components/Layout/Header.jsx
- public/src/components/Character/CharacterSheet.jsx
- public/src/components/Combat/CombatView.jsx
- public/src/components/Inventory/Inventory.jsx
- public/src/components/Map/MapView.jsx
- public/src/components/Quests/QuestLog.jsx
- public/src/components/Achievements/AchievementTracker.jsx
- public/src/components/Dialogue/DialogueModal.jsx
- public/src/components/Settings/SettingsModal.jsx
- public/src/store/gameStore.js
- public/src/index.css
