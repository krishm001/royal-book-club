# Epic: Page Landings and Experience

## 1. Vision & Goals
The core objective of this epic is to enhance the user experience by ensuring that users land at the most relevant section of a page upon navigation. This includes setting the correct default scroll position, maintaining context when navigating via specific actions, ensuring seamless redirection from the home page to internal content, and improving popup interactions by preventing background scrolling.

## 2. Requirements

### 2.1 Default Page Scroll Positions
Upon entry to any page, the system must automatically scroll to the correct default location, unless overridden by a contextual landing logic (e.g., clicking specific action buttons).
- **Home Page**: Top.
- **Study Page**: Top, ensuring self-checkout options are at the top and the search filter is visible.
- **Book Detail Page**: Maintain existing contextual scroll logic. Ensure checkout/return buttons are visible by default. If a user returns a book and clicks "write review" on the return popup, they must be navigated directly to the bottom where the review section is located.
- **Assembly Page**: Scroll to the "Select library Type" section at the top.
- **Discourses Page**: Scroll to almost the top where tabs "Intellectual Chronicles" and "Courtyard debates" are visible.
- **Gatepass Page**: Top.
- **Profile Page**: Top.
- **Curator Console**: Top.
- **Book Ingestion**: Maintain existing right scroll, positioning exactly where the search panel is shown on top.
- **All other consoles**: Top.

### 2.2 Discourses UI Updates
- Remove explicit action buttons like "examine essay" or "join dialog" from Discourse cards.
- Make the entire Discourse card clickable, allowing users to navigate inside the content by clicking anywhere on the card.

### 2.3 Redirections
- **Home Page Redirections**: Links on the home page pointing to specific Discourse items (e.g., a blog) must take the user directly to that blog/content.
- Apply the same direct redirection flow for Assembly items linked from the home page.

### 2.4 Popup Experience
- When any popup is opened (e.g., Login popup), the scroll of the background page must be frozen. This ensures the popup itself can be scrolled easily where applicable, without scrolling the underlying page content.

## 3. Phases of Implementation

### Phase 1: Global Popup Scroll Lock & Redirections
- Implement a global mechanism to lock/freeze background scrolling when modal popups (e.g., login) are open.
- Implement direct redirections for Home Page links to Discourse items (e.g., blogs) and Assembly items.

### Phase 2: Discourse UI Enhancements
- Update Discourse cards to be entirely clickable.
- Remove "examine essay" and "join dialog" buttons from the UI.

### Phase 3: Page Specific Scroll Landings
- Implement default scrolling logic for Home, Study, Assembly, Discourses, Gatepass, Profile, Curator Console, and other consoles.
- Refine Book Detail page scroll logic to handle the "write review" context from the return popup.
- Verify Book Ingestion page scroll logic remains intact.

## 4. Conflict Resolution (Default vs Contextual)
In cases where a user navigates to a page via a specific action (e.g., "view gate pass" or "write review"), the contextual landing logic takes precedence over the default page scroll.
