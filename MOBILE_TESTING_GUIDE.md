# Mobile & Tablet Testing Guide

## Quick Start - Browser DevTools Testing

### Chrome DevTools
1. Open the game in Chrome
2. Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
3. Click the device toolbar icon or press `Ctrl+Shift+M` (Windows/Linux) / `Cmd+Shift+M` (Mac)
4. Select a device preset or enter custom dimensions

### Recommended Test Devices

#### Mobile Phones
| Device | Width | Height | Notes |
|--------|-------|--------|-------|
| iPhone SE | 375px | 667px | Smallest common iPhone |
| iPhone 12/13 | 390px | 844px | Standard modern iPhone |
| iPhone 14 Pro Max | 430px | 932px | Large iPhone |
| Samsung Galaxy S20 | 360px | 800px | Common Android size |
| Google Pixel 5 | 393px | 851px | Modern Android |

#### Tablets
| Device | Width | Height | Notes |
|--------|-------|--------|-------|
| iPad Mini | 768px | 1024px | Small tablet |
| iPad | 820px | 1180px | Standard iPad |
| iPad Pro 11" | 834px | 1194px | Medium tablet |
| iPad Pro 12.9" | 1024px | 1366px | Large tablet |

## Features to Test

### ✅ Critical Mobile Features

#### 1. Navigation
- [ ] Hamburger menu button appears on mobile (< lg breakpoint)
- [ ] Tapping hamburger opens sidebar overlay
- [ ] Sidebar slides in smoothly from left
- [ ] Tapping overlay background closes menu
- [ ] X button in sidebar closes menu
- [ ] Selecting a tab closes menu automatically
- [ ] Desktop shows icon sidebar without hamburger

#### 2. Header
- [ ] Player info displays correctly on mobile
- [ ] Gold counter is visible and readable
- [ ] Stats bars hidden on mobile (< md)
- [ ] Stats bars visible on tablet and desktop
- [ ] All text is readable without zooming

#### 3. Character Sheet
- [ ] Character overview stacks vertically on mobile
- [ ] Level badge is appropriately sized
- [ ] Stats display in 1 column on mobile
- [ ] Stats display in 2 columns on tablet
- [ ] Stats display in 3 columns on desktop
- [ ] Equipment grid adapts to screen size

#### 4. Combat View
- [ ] Modal fits screen without horizontal scroll
- [ ] Player and monster stack vertically on mobile
- [ ] HP bars are visible and clear
- [ ] Combat log is scrollable
- [ ] Action buttons are easily tappable (4 buttons in 2x2 grid on mobile)
- [ ] Combat actions feel responsive to touch
- [ ] All buttons meet 44px minimum size

#### 5. Inventory
- [ ] Item grid shows 3 columns on mobile
- [ ] Filter buttons wrap on mobile if needed
- [ ] Items are easily tappable
- [ ] Selected item details display properly
- [ ] Scrolling works smoothly

#### 6. Map/Locations
- [ ] Location cards stack in single column on mobile
- [ ] Current location indicator is visible
- [ ] Travel buttons are easily tappable
- [ ] Location details are readable

#### 7. Quests
- [ ] Quest tabs work on mobile (Active/Available)
- [ ] Quest cards display in single column on mobile
- [ ] Quest objectives are readable
- [ ] Accept/Abandon buttons are easy to tap

#### 8. Achievements
- [ ] Achievement grid shows 1 column on mobile
- [ ] Progress bars display correctly
- [ ] Achievement details are readable
- [ ] Locked achievements are visually distinct

#### 9. Modals (Dialogue & Settings)
- [ ] Modals fit on screen without cutting off
- [ ] Close button is easily accessible
- [ ] Content scrolls if too tall for screen
- [ ] Buttons are easily tappable
- [ ] Text is readable

### 🎯 Touch Interaction Tests

#### Button Tests
1. Tap buttons quickly - should respond immediately
2. Try double-tapping - should not cause issues
3. Swipe over buttons - should not trigger clicks
4. All buttons should have visible feedback when tapped

#### Scrolling Tests
1. Vertical scrolling should be smooth
2. Horizontal scrolling should not occur
3. Overscroll should not cause bounce (iOS)
4. Combat log should scroll independently

#### Form Tests (if applicable)
1. Inputs should zoom to fill screen when focused
2. Keyboard should not cover input fields
3. Submit buttons should be reachable

### 📱 Orientation Tests

#### Portrait (Default)
- [ ] All features work in portrait mode
- [ ] Content doesn't overflow
- [ ] Navigation is accessible

#### Landscape
- [ ] Game works in landscape orientation
- [ ] Layout adapts appropriately
- [ ] All features remain accessible

## Performance Testing

### Load Time
- [ ] Initial page load < 3 seconds on 4G
- [ ] Subsequent navigations feel instant
- [ ] Images load progressively (if added)

### Animations
- [ ] Sidebar slide animation is smooth (60fps)
- [ ] Transitions don't lag or stutter
- [ ] Combat animations are fluid

### Memory
- [ ] No memory leaks during extended play
- [ ] Smooth performance after 30+ minutes

## Accessibility Testing

### Visual
- [ ] All text meets WCAG contrast requirements
- [ ] Icons are recognizable at mobile sizes
- [ ] Colors don't rely on screen brightness

### Motor
- [ ] All touch targets are 44px or larger
- [ ] Buttons have spacing between them
- [ ] No precision tapping required

### Screen Readers (Optional)
- [ ] Important elements have ARIA labels
- [ ] Navigation is logical
- [ ] Announcements are meaningful

## Browser Compatibility

### iOS Safari
- [ ] Layout works correctly
- [ ] Touch events work properly
- [ ] No viewport zoom issues
- [ ] Safe area respected (notch)

### Chrome Mobile (Android)
- [ ] Layout works correctly
- [ ] Touch events work properly
- [ ] No viewport issues
- [ ] Hardware back button handled (if applicable)

### Firefox Mobile
- [ ] Basic functionality works
- [ ] Layout is acceptable

## Common Issues to Check

### Layout Issues
- ❌ Horizontal scrolling (should never happen)
- ❌ Text too small to read
- ❌ Buttons too close together
- ❌ Content cut off at edges
- ❌ Modal larger than viewport

### Interaction Issues
- ❌ Buttons don't respond to tap
- ❌ Tap delay (should be instant)
- ❌ Accidental clicks
- ❌ Scroll not working
- ❌ Menu doesn't close

### Visual Issues
- ❌ Text overlapping
- ❌ Images stretched or squished
- ❌ Colors not visible
- ❌ Animations janky

## Real Device Testing

### If Testing on Actual Devices

#### Setup
1. Connect device to same network as dev server
2. Find your computer's IP address
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`
3. Access game at `http://YOUR_IP:PORT`

#### Additional Checks
- [ ] Touch feels natural
- [ ] Reading at arm's length is comfortable
- [ ] Battery drain is reasonable
- [ ] No excessive heat
- [ ] Works with screen rotation locked

## Automated Testing (Future)

Consider adding:
- Cypress for E2E testing with mobile viewports
- Lighthouse for mobile performance scores
- Percy/Chromatic for visual regression testing

## Reporting Issues

When reporting mobile issues, include:
1. Device type and size (or browser + dimensions)
2. Orientation (portrait/landscape)
3. Exact steps to reproduce
4. Screenshot or screen recording
5. Browser console errors (if any)

## Success Criteria

The responsive design is successful when:
- ✅ All features work on 375px width (iPhone SE)
- ✅ No horizontal scrolling at any breakpoint
- ✅ All touch targets meet 44px minimum
- ✅ Text is readable without zooming
- ✅ Navigation is intuitive on mobile
- ✅ Performance is smooth (no lag)
- ✅ Works in both orientations
- ✅ Looks good on tablet sizes too
