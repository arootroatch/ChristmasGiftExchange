---
name: project-map
description: Full file structure tree for the Christmas Gift Exchange project — source, pages, netlify functions, spec tests, e2e tests
---

# Project File Structure

```
src/
  EventEmitter.js        # Reusable EventEmitter class
  Snackbar.js            # Shared toast notification component
  CookieBanner.js        # Cookie consent banner
  authGate.js            # Auth gate UI (email verification code flow)
  utils.js               # DOM helpers (selectElement, click, addEventListener, pushHTML, unshiftHTML, escape, escapeAttr, apiFetch)
  vitePageRoutes.js      # Vite plugin for multi-page build
  vitePrerenderPlugin.js # Vite plugin for prerendering pages
  reuse.js               # Reuse previous exchange page
  wishlistView.js        # Wishlist viewing page
  exchange/
    index.js             # Entry point, initializes all exchange components
    state.js             # Private state + mutation functions + event emission (state NOT exported)
    generate.js          # Name drawing algorithm (uses accessor functions, not state)
    dragDrop.js          # Drag and drop name reassignment
    components/
      ControlStrip/
        ControlStrip.js    # Container shell with slots + keybinding helpers
        NextStepButton.js  # Next Step button component
        AddHouseButton.js  # Add Group button component
        GenerateButton.js  # Generate List button component
      House.js           # House/group container component
      NameList.js        # Name list container component
      Name.js            # Participant name management
      Select.js          # Dropdown rendering
      ResultsTable.js    # Results display (event-driven)
      Instructions.js    # Intro instructions component
      EmailTable/
        EmailTable.js    # Email collection UI
      RecipientSearch.js # Recipient search

  wishlistEdit/
    index.js             # Entry point, initializes wishlist edit components
    state.js             # Encapsulated state for wishlist edit page
    components/
      Greeting.js        # User greeting display
      WishlistList.js    # Wishlist URL management
      ItemList.js        # Individual item management
      SaveButton.js      # Save wishlist button + API call
      ContactForm.js     # Contact info form + API call

pages/
  reuse/index.html         # Reuse exchange page
  wishlist/edit/index.html # Wishlist editing page
  wishlist/view/index.html # Wishlist viewing page

netlify/
  shared/
    middleware.mjs     # apiHandler wrapper + validateBody + requireAuth + validateOrigin
    responses.mjs      # HTTP response helpers (ok, okWithHeaders, badRequest, etc.)
    jwt.mjs            # JWT signing/verification, session cookie builders, cookie parser
    authCodes.mjs      # Email verification code generation + HMAC hashing + verification
    rateLimit.mjs      # IP-based rate limiting via MongoDB
    giverNotification.mjs # Giver notification loop + email sending
    emailDispatch.mjs  # Postmark API integration
    links.mjs          # URL builder helpers for email links
    multimethod.mjs    # Multiple dispatch utility
    db.mjs             # MongoDB connection + collection getters
    schemas/
      user.mjs         # User, wishlist, wishItem Zod schemas
      exchange.mjs     # Exchange, assignment, house Zod schemas
    emails/
      layout.mjs           # Shared email HTML layout
      verificationCode.mjs # Verification code email template
      secretSanta.mjs      # Secret Santa assignment email
      wishlistLink.mjs     # Wishlist link email
      wishlistNotification.mjs # Wishlist update notification
      contactInfo.mjs      # Contact info email
      resultsSummary.mjs   # Results summary email
      errorAlert.mjs       # Error alert email
      escapeHtml.mjs       # HTML escaping for email content
  functions/
    api-auth-code-post.mjs     # Send email verification code
    api-auth-verify-post.mjs   # Verify code, issue JWT session cookie
    api-auth-logout-post.mjs   # Clear session cookie
    api-exchange-post.mjs      # Create exchange
    api-user-get.mjs           # Get authenticated user data
    api-user-wishlist-get.mjs  # View recipient wishlist
    api-user-wishlist-put.mjs  # Update wishlists (authenticated)
    api-my-exchanges-get.mjs   # Get exchanges for authenticated user
    api-results-email-post.mjs # Send result emails (organizer)
    api-wishlist-email-post.mjs # Send wishlist link emails
    api-user-contact-post.mjs  # Send contact info to givers
    api-giver-retry-post.mjs   # Retry failed email sends
    api-recipient-get.mjs      # Lookup recipient by giver email
    api-email-preview-get.mjs  # Email template preview (dev)
    get_name.mjs               # Legacy: get recipient name
    postToDb.mjs               # Legacy: store exchange data

spec/
  specHelper.js          # Test utilities (initReactiveSystem, resetState, enterName, click, etc.)
  setupTests.js          # JSDOM initialization from index.html
  testData.js
  utils.spec.js
  viteMultiPagePlugin.spec.js
  Snackbar.spec.js
  authGate.spec.js
  wishlistView.spec.js
  reuse.spec.js
  exchange/
    state.spec.js
    generate.spec.js
    dragDrop.spec.js
    index.spec.js
    layout.spec.js
    components/
      ControlStrip/
        ControlStrip.spec.js
        NextStepButton.spec.js
        AddHouseButton.spec.js
        GenerateButton.spec.js
      RecipientSearch.spec.js
      EmailTable/
        EmailTable.spec.js
      ResultsTable.spec.js
      House.spec.js
      NameList.spec.js
      Name.spec.js
      Instructions.spec.js
  wishlistEdit/
    index.spec.js
    state.spec.js
  netlify-functions/
    middleware.spec.js
    requireAuth.spec.js
    jwt.spec.js
    authCodes.spec.js
    rateLimit.spec.js
    multimethod.spec.js
    escapeHtml.spec.js
    db.spec.js
    giverNotification.spec.js
    api-auth-code-post.spec.js
    api-auth-verify-post.spec.js
    api-auth-logout-post.spec.js
    api-exchange-post.spec.js
    api-user-get.spec.js
    api-user-wishlist-get.spec.js
    api-user-wishlist-put.spec.js
    api-my-exchanges-get.spec.js
    api-results-email-post.spec.js
    api-wishlist-email-post.spec.js
    api-user-contact-post.spec.js
    api-giver-retry-post.spec.js
    api-recipient-get.spec.js
    api-email-preview-get.spec.js
    schemas/
      user.spec.js
  shared/
    testFactories.js     # Shared makeUser, makeExchange, buildEvent factories
  integration/
    contractHelper.js    # Contract test setup (re-exports factories + mongo helpers)
    api-exchange-post.contract.spec.js
    api-giver-retry-post.contract.spec.js
    api-user-contact-post.contract.spec.js
    api-user-wishlist-put.contract.spec.js
  dev/
    migrate-legacy.spec.js

e2e/
  playwright.config.js   # Playwright config (workers: 1, port 8888)
  globalSetup.js         # Starts MongoMemoryServer + netlify dev
  helpers.js             # DB connection, seeding, query helpers for e2e
  create-exchange.spec.js
  edit-wishlist.spec.js
  reuse-exchange.spec.js
  recipient-search.spec.js
```
