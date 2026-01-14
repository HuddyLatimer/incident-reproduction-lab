# Debugging Guide: Login Failures

A step-by-step guide for debugging "random" login failures.

---

## Table of Contents

1. [Initial Triage](#1-initial-triage)
2. [Reproducing the Issue](#2-reproducing-the-issue)
3. [Network Analysis](#3-network-analysis)
4. [Log Analysis](#4-log-analysis)
5. [Root Cause Identification](#5-root-cause-identification)
6. [Common Patterns](#6-common-patterns)

---

## 1. Initial Triage

### Questions to Ask
- [ ] Which users are affected?
- [ ] Is it consistent (always fails) or intermittent?
- [ ] What error message do they see?
- [ ] When did it start happening?

### Quick Checks
```bash
# Check if server is running
curl http://localhost:3000/api/health

# Check server logs for errors
tail -f server.log

# Check user data for anomalies
curl http://localhost:3000/api/debug/users
```

---

## 2. Reproducing the Issue

### Test Matrix

| User | Expected | Command |
|------|----------|---------|
| alice | ✅ Pass | `curl -X POST localhost:3000/api/login -H "Content-Type: application/json" -d '{"username":"alice","password":"password123"}'` |
| charlie | ❌ Fail | `curl -X POST localhost:3000/api/login -H "Content-Type: application/json" -d '{"username":"charlie","password":"charlie456"}'` |
| david | ❌ Fail | `curl -X POST localhost:3000/api/login -H "Content-Type: application/json" -d '{"username":"david","password":"david789"}'` |
| emma | ❌ Fail | `curl -X POST localhost:3000/api/login -H "Content-Type: application/json" -d '{"username":"emma","password":"emma321"}'` |

### Using the Web UI

1. Open http://localhost:3000
2. Click on a "buggy" user chip (yellow background)
3. Click "Sign In"
4. Observe the error in the red message box
5. Check the Debug Panel for request/response details

---

## 3. Network Analysis

### Browser DevTools Method

1. Open DevTools (F12)
2. Go to Network tab
3. Attempt login
4. Click on the `/api/login` request
5. Check:
   - **Status Code**: 401 = unauthorized
   - **Request Payload**: What was sent
   - **Response Body**: Error details

### cURL Method

```bash
# Verbose output showing headers
curl -v -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"charlie","password":"charlie456"}'
```

### Expected Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | N/A |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Check credentials |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Check server logs |

---

## 4. Log Analysis

### Reading Server Logs

```bash
# Watch logs in real-time
tail -f server.log

# Search for specific user
grep "charlie" server.log

# Find all failures
grep "WARN" server.log

# Find credential mismatches specifically
grep "credentials mismatch" server.log
```

### Key Log Fields to Check

```json
{
  "hint": "Username exists with different casing or whitespace",
  "storedUsername": "Charlie",      // What's in the database
  "storedUsernameLength": 7,        // Length in DB
  "providedUsernameLength": 7       // Length user entered
}
```

### Interpreting Length Differences

| Stored | Provided | Diagnosis |
|--------|----------|-----------|
| 7 | 7 | Same length → Case issue |
| 6 | 5 | Different → Whitespace in stored |
| 5 | 4 | Different → Whitespace in stored |

---

## 5. Root Cause Identification

### The Bug Location

**File:** `server.js`, Line ~97

```javascript
// BUGGY CODE
const user = users.find(u => u.username === username && u.password === password);
```

### Why It's Wrong

JavaScript's `===` operator:
- Is **case-sensitive**: `"Charlie" !== "charlie"`
- Considers whitespace significant: `"david " !== "david"`

### The Fix

```javascript
// FIXED CODE
const normalizedInput = username.toLowerCase().trim();
const user = users.find(u =>
  u.username.toLowerCase().trim() === normalizedInput &&
  u.password === password
);
```

---

## 6. Common Patterns

### Pattern: "Works for Some Users, Not Others"

**Symptom:** Login works for alice/bob but not charlie/david/emma

**Investigation:**
1. Check usernames in database
2. Look for case differences
3. Look for whitespace (compare lengths)

**Root Cause:** Data quality issue + strict comparison

---

### Pattern: "Used to Work, Now Doesn't"

**Symptom:** User could log in before, now can't

**Investigation:**
1. Check if user data was modified
2. Check for password reset issues
3. Check for account lockout

---

### Pattern: "Rate Limit Errors"

**Symptom:** 429 Too Many Requests

**Investigation:**
```bash
# Check rate limit status in logs
grep "rate limit" server.log
```

**Resolution:** Wait for rate limit window to expire (60 seconds)

---

## Quick Reference

### Useful Commands

```bash
# Start server
npm start

# Check health
curl localhost:3000/api/health

# View users (debug)
curl localhost:3000/api/debug/users

# Test login
curl -X POST localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"USER","password":"PASS"}'

# Watch logs
tail -f server.log
```

### Files to Check

| File | Purpose |
|------|---------|
| `server.js` | Backend logic, bug location |
| `server.log` | Runtime logs |
| `public/index.html` | Frontend with debug panel |

---

## See Also

- [INCIDENT_REPORT.md](../INCIDENT_REPORT.md) - Full incident documentation
- [screenshots/](screenshots/) - Visual documentation
