# Screenshot: Failing Login Requests (Whitespace Bugs)

**Scenario:** Users "david" and "emma" fail to log in due to hidden whitespace in stored usernames

---

## Bug #1: Trailing Whitespace (david)

### Browser View
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Username: [david          ]     │  LAST RESPONSE                           │
│  Password: [••••••••       ]     │  {                                       │
│                                  │    "status": 401,                        │
│  [        Sign In         ]      │    "success": false,                     │
│                                  │    "error": "Invalid username            │
│  ❌ Error: Invalid username      │            or password",                 │
│     or password                  │    "code": "INVALID_CREDENTIALS"         │
│                                  │  }                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Hidden Character
```
Stored:   "david "   ← There's a space here you can't see!
          d a v i d [SPACE]
          0 1 2 3 4 5        = 6 characters

Provided: "david"
          d a v i d
          0 1 2 3 4          = 5 characters
```

### Hex Proof
```
curl http://localhost:3000/api/debug/users | grep david

"username": "david ",
"usernameLength": 6,
"usernameHex": "646176696420"
                          ^^
                          20 = ASCII space (0x20)
```

---

## Bug #2: Leading Whitespace (emma)

### Browser View
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Username: [emma           ]     │  LAST RESPONSE                           │
│  Password: [••••••••       ]     │  {                                       │
│                                  │    "status": 401,                        │
│  [        Sign In         ]      │    "success": false,                     │
│                                  │    "error": "Invalid username            │
│  ❌ Error: Invalid username      │            or password",                 │
│     or password                  │    "code": "INVALID_CREDENTIALS"         │
│                                  │  }                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Hidden Character
```
Stored:   " emma"    ← Space at the BEGINNING!
          [SPACE] e m m a
          0       1 2 3 4    = 5 characters

Provided: "emma"
          e m m a
          0 1 2 3            = 4 characters
```

### Hex Proof
```
curl http://localhost:3000/api/debug/users | grep emma

"username": " emma",
"usernameLength": 5,
"usernameHex": "20656d6d61"
               ^^
               20 = ASCII space (0x20) at the START
```

---

## Server Log Evidence

```json
// david login attempt
{
  "level": "WARN",
  "message": "Login failed - credentials mismatch (possible case/whitespace issue)",
  "username": "david",
  "storedUsername": "david ",
  "storedUsernameLength": 6,    // ← 6 chars in DB
  "providedUsernameLength": 5   // ← 5 chars provided
}

// emma login attempt
{
  "level": "WARN",
  "message": "Login failed - credentials mismatch (possible case/whitespace issue)",
  "username": "emma",
  "storedUsername": " emma",
  "storedUsernameLength": 5,    // ← 5 chars in DB
  "providedUsernameLength": 4   // ← 4 chars provided
}
```

---

## Why This Happens

### Root Cause: No Input Sanitization at Registration

```javascript
// Hypothetical registration code that caused the problem:
function registerUser(username, password) {
  // BUG: No trimming of whitespace!
  users.push({
    username: username,  // Should be: username.trim()
    password: password
  });
}

// User accidentally typed " emma" with a leading space
// Or copy-pasted "david " with a trailing space
// The whitespace got stored in the database
```

### The Fix

```javascript
// At registration (prevention)
const cleanUsername = username.trim();

// At login (defense in depth)
const normalizedInput = username.toLowerCase().trim();
const user = users.find(u =>
  u.username.toLowerCase().trim() === normalizedInput
);
```

---

## Detection Tips

1. **Compare Lengths**: If `storedLength !== providedLength`, there's whitespace
2. **Use Hex Dump**: `20` at start or end of hex = space character
3. **Visual Inspection**: Copy username from logs, paste into text editor, look for spaces
