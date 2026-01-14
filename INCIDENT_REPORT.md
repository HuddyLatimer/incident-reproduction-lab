# Incident Report: Login Randomly Fails for Some Users

**Incident ID:** INC-2024-001
**Severity:** Medium
**Status:** Root Cause Identified
**Reported:** 2024-01-15
**Resolved:** Pending Fix Deployment

---

## Executive Summary

Users report intermittent login failures with the message "Invalid username or password" despite entering correct credentials. The issue affects approximately 3 out of 5 test users (60%) and appears "random" to end users.

---

## 1. Customer Report

> "Login randomly fails for some users."

Initial symptoms:
- Users report being unable to log in
- Same credentials sometimes work, sometimes don't
- No pattern visible to end users
- Support tickets increasing

---

## 2. Steps to Reproduce

### Environment Setup
```bash
cd incident-reproduction-lab
npm install
npm start
```

### Reproduction Steps

#### Test Case 1: Working Login (Control)
1. Navigate to `http://localhost:3000`
2. Enter username: `alice`
3. Enter password: `password123`
4. Click "Sign In"
5. **Expected:** Login succeeds
6. **Actual:** Login succeeds ✅

#### Test Case 2: Case Sensitivity Bug
1. Navigate to `http://localhost:3000`
2. Enter username: `charlie` (lowercase)
3. Enter password: `charlie456`
4. Click "Sign In"
5. **Expected:** Login succeeds (user exists)
6. **Actual:** Login fails with "Invalid username or password" ❌

**Root Cause:** Username stored as `Charlie` (capital C), but comparison is case-sensitive.

#### Test Case 3: Trailing Whitespace Bug
1. Navigate to `http://localhost:3000`
2. Enter username: `david` (no trailing space)
3. Enter password: `david789`
4. Click "Sign In"
5. **Expected:** Login succeeds
6. **Actual:** Login fails ❌

**Root Cause:** Username stored as `david ` (with trailing space).

#### Test Case 4: Leading Whitespace Bug
1. Navigate to `http://localhost:3000`
2. Enter username: `emma` (no leading space)
3. Enter password: `emma321`
4. Click "Sign In"
5. **Expected:** Login succeeds
6. **Actual:** Login fails ❌

**Root Cause:** Username stored as ` emma` (with leading space).

#### Test Case 5: Rate Limiting (Secondary Issue)
1. Attempt 4+ failed logins rapidly
2. **Expected:** Rate limit message
3. **Actual:** Returns 429 with retry time ✅ (working as intended)

---

## 3. Expected vs Actual Behavior

| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| Login with `alice/password123` | Success | Success | ✅ |
| Login with `bob/securepass` | Success | Success | ✅ |
| Login with `charlie/charlie456` | Success | Failure (401) | ❌ |
| Login with `david/david789` | Success | Failure (401) | ❌ |
| Login with `emma/emma321` | Success | Failure (401) | ❌ |

---

## 4. Network Request Analysis

### Failing Request Example

**Request:**
```http
POST /api/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "username": "charlie",
  "password": "charlie456"
}
```

**Response:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "success": false,
  "error": "Invalid username or password",
  "code": "INVALID_CREDENTIALS"
}
```

### Successful Request Example

**Request:**
```http
POST /api/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "username": "alice",
  "password": "password123"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com"
  },
  "token": "MToxNzA1MzI0ODAwMDAw"
}
```

---

## 5. Server Log Analysis

### Log Entry for Failing Login (charlie)
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "WARN",
  "message": "Login failed - credentials mismatch (possible case/whitespace issue)",
  "username": "charlie",
  "clientIP": "::1",
  "hint": "Username exists with different casing or whitespace",
  "storedUsername": "Charlie",
  "storedUsernameLength": 7,
  "providedUsernameLength": 7
}
```

### Log Entry for Failing Login (david)
```json
{
  "timestamp": "2024-01-15T10:31:12.456Z",
  "level": "WARN",
  "message": "Login failed - credentials mismatch (possible case/whitespace issue)",
  "username": "david",
  "clientIP": "::1",
  "hint": "Username exists with different casing or whitespace",
  "storedUsername": "david ",
  "storedUsernameLength": 6,
  "providedUsernameLength": 5
}
```

**Key Insight:** The `storedUsernameLength` vs `providedUsernameLength` difference reveals the whitespace issue.

---

## 6. Root Cause Analysis

### Primary Bug Location
**File:** `server.js`
**Line:** ~97-98

```javascript
// THE BUG IS HERE: Direct comparison without normalization
const user = users.find(u => u.username === username && u.password === password);
```

### Contributing Factors

1. **Case-Sensitive Comparison:** JavaScript's `===` operator is case-sensitive. Users registered with mixed-case usernames but typically type lowercase.

2. **Whitespace in Stored Data:** User registration (simulated) did not sanitize input, resulting in leading/trailing whitespace being stored.

3. **No Input Normalization:** The login endpoint does not normalize user input before comparison.

### Why It Appears "Random"

- Users `alice` and `bob` have all-lowercase usernames with no whitespace → always works
- Users `Charlie`, `david `, and ` emma` have case/whitespace issues → always fails
- From the user's perspective, they see "some users can log in, some can't" → appears random

---

## 7. Proposed Fix

### Option A: Normalize at Login (Quick Fix)
```javascript
// Normalize both stored and input usernames for comparison
const normalizedInput = username.toLowerCase().trim();
const user = users.find(u =>
  u.username.toLowerCase().trim() === normalizedInput &&
  u.password === password
);
```

**Pros:** Quick to implement, no database migration
**Cons:** Comparison overhead on every login

### Option B: Normalize Data in Database (Proper Fix)
```javascript
// Migration script to normalize existing usernames
UPDATE users SET username = LOWER(TRIM(username));

// Add validation at registration
const normalizedUsername = username.toLowerCase().trim();
```

**Pros:** Fixes root cause, cleaner data
**Cons:** Requires database migration, may affect existing integrations

### Option C: Hybrid Approach (Recommended)
1. Immediately deploy Option A as hotfix
2. Schedule Option B for next maintenance window
3. Add input validation to registration to prevent future issues

---

## 8. Prevention Recommendations

1. **Input Validation:** Always sanitize and normalize user input at registration time
2. **Case-Insensitive Auth:** Use case-insensitive comparison for usernames
3. **Automated Testing:** Add test cases for edge cases (whitespace, casing)
4. **Logging:** Enhanced logging helped identify this issue quickly

---

## 9. Timeline

| Time | Event |
|------|-------|
| T+0 | Customer reports "login randomly fails" |
| T+15min | Reproduced issue with test accounts |
| T+30min | Identified case-sensitivity as factor |
| T+45min | Found whitespace issues in logs |
| T+1hr | Root cause confirmed |
| T+1hr 15min | Fix proposed and documented |

---

## 10. Artifacts

### Files in This Repository
- `server.js` - Express backend with intentional bug
- `public/index.html` - Frontend login form with debug panel
- `server.log` - Server logs (generated at runtime)
- `INCIDENT_REPORT.md` - This document

### Debug Endpoints
- `GET /api/debug/users` - View stored usernames (shows length/hex for whitespace detection)
- `GET /api/health` - Health check

---

## 11. Lessons Learned

1. "Random" failures usually have a pattern - investigate edge cases
2. Logging with context (username lengths, hints) accelerates debugging
3. String comparison bugs are common and easy to miss in code review
4. User input should always be normalized at the boundary

---

**Report Author:** Incident Response Team
**Last Updated:** 2024-01-15
