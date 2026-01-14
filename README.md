# Incident Reproduction Lab

A demonstration project showing how to reproduce, debug, and document a "random login failure" bug.

## The Scenario

**Customer Report:** "Login randomly fails for some users."

**Reality:** The login failures aren't random - they're caused by case-sensitivity and whitespace issues in username storage/comparison.

## Quick Start

```bash
npm install
npm start
```

Then open `http://localhost:3000` in your browser.

## Test Users

| Username | Password | Works? | Issue |
|----------|----------|--------|-------|
| alice | password123 | Yes | None |
| bob | securepass | Yes | None |
| charlie | charlie456 | **No** | Stored as "Charlie" (capital C) |
| david | david789 | **No** | Stored as "david " (trailing space) |
| emma | emma321 | **No** | Stored as " emma" (leading space) |

## The Bug

In `server.js`, the login comparison uses strict equality without normalization:

```javascript
// BUG: Case-sensitive, whitespace-sensitive comparison
const user = users.find(u => u.username === username && u.password === password);
```

## The Fix

```javascript
// FIX: Normalize before comparison
const normalizedInput = username.toLowerCase().trim();
const user = users.find(u =>
  u.username.toLowerCase().trim() === normalizedInput &&
  u.password === password
);
```

## Debug Features

- **Debug Panel:** The UI shows request/response details
- **Network Log:** See all API calls with status codes
- **Server Logs:** Check `server.log` for detailed logging
- **Debug Endpoint:** `GET /api/debug/users` shows username lengths

## Files

- `server.js` - Express backend with the bug
- `public/index.html` - Frontend with debug tools
- `INCIDENT_REPORT.md` - Full incident documentation

## Skills Demonstrated

- Bug reproduction
- Root cause analysis
- Network request inspection
- Log analysis
- Incident documentation
