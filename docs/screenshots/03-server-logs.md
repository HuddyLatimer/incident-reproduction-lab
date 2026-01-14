# Screenshot: Server Logs Analysis

**File:** `server.log`

This shows the server-side logging that reveals the root cause of the "random" login failures.

---

## Full Server Log Output

```
=== Server started at 2026-01-14T21:28:58.856Z ===

[2026-01-14T21:38:36.146Z] [INFO] Login attempt received {"username":"charlie","clientIP":"::1"}
[2026-01-14T21:38:36.146Z] [WARN] Login failed - credentials mismatch (possible case/whitespace issue)
  {
    "username": "charlie",
    "clientIP": "::1",
    "hint": "Username exists with different casing or whitespace",
    "storedUsername": "Charlie",          ← CAPITAL C!
    "storedUsernameLength": 7,
    "providedUsernameLength": 7
  }

[2026-01-14T21:38:54.759Z] [INFO] Login attempt received {"username":"bob","clientIP":"::1"}
[2026-01-14T21:38:54.759Z] [INFO] Login successful {"username":"bob","userId":2,"clientIP":"::1"}

[2026-01-14T21:39:13.313Z] [INFO] Login attempt received {"username":"alice","clientIP":"::1"}
[2026-01-14T21:39:13.313Z] [INFO] Login successful {"username":"alice","userId":1,"clientIP":"::1"}

[2026-01-14T21:39:13.715Z] [INFO] Login attempt received {"username":"david","clientIP":"::1"}
[2026-01-14T21:39:13.715Z] [WARN] Login failed - credentials mismatch (possible case/whitespace issue)
  {
    "username": "david",
    "clientIP": "::1",
    "hint": "Username exists with different casing or whitespace",
    "storedUsername": "david ",            ← TRAILING SPACE!
    "storedUsernameLength": 6,             ← 6 chars stored
    "providedUsernameLength": 5            ← 5 chars provided
  }

[2026-01-14T21:39:14.165Z] [INFO] Login attempt received {"username":"emma","clientIP":"::1"}
[2026-01-14T21:39:14.165Z] [WARN] Login failed - credentials mismatch (possible case/whitespace issue)
  {
    "username": "emma",
    "clientIP": "::1",
    "hint": "Username exists with different casing or whitespace",
    "storedUsername": " emma",             ← LEADING SPACE!
    "storedUsernameLength": 5,             ← 5 chars stored
    "providedUsernameLength": 4            ← 4 chars provided
  }
```

---

## Key Observations

### 1. Case Sensitivity (Charlie)
```
storedUsername: "Charlie"    (capital C)
providedUsername: "charlie"  (lowercase)
Both have length 7, but don't match due to case
```

### 2. Trailing Whitespace (david)
```
storedUsername: "david "     (with trailing space)
storedUsernameLength: 6
providedUsernameLength: 5    ← Different lengths reveal the issue!
```

### 3. Leading Whitespace (emma)
```
storedUsername: " emma"      (with leading space)
storedUsernameLength: 5
providedUsernameLength: 4    ← Different lengths reveal the issue!
```

---

## Log Analysis Tips

1. **Length Mismatch = Whitespace Issue**
   - If `storedUsernameLength !== providedUsernameLength`, there's hidden whitespace

2. **Same Length but Failed = Case Issue**
   - If lengths match but login fails with "case/whitespace" hint, it's a case mismatch

3. **The Hint is Key**
   - Log message explicitly says "Username exists with different casing or whitespace"
   - This tells us the user EXISTS but comparison failed

---

## Terminal View (Real Output)

```bash
$ cat server.log | grep -A1 "credentials mismatch"

[WARN] Login failed - credentials mismatch (possible case/whitespace issue)
  {"username":"charlie","hint":"Username exists...","storedUsername":"Charlie"...}

[WARN] Login failed - credentials mismatch (possible case/whitespace issue)
  {"username":"david","hint":"Username exists...","storedUsername":"david "...}

[WARN] Login failed - credentials mismatch (possible case/whitespace issue)
  {"username":"emma","hint":"Username exists...","storedUsername":" emma"...}
```

---

## Debug Endpoint Output

```bash
$ curl http://localhost:3000/api/debug/users

[
  {"id":3,"username":"Charlie","usernameLength":7,"usernameHex":"436861726c6965"},
                                                               ^^ 43 = 'C' (uppercase)

  {"id":4,"username":"david ","usernameLength":6,"usernameHex":"646176696420"},
                                                                          ^^ 20 = space

  {"id":5,"username":" emma","usernameLength":5,"usernameHex":"20656d6d61"}
                                                              ^^ 20 = space at START
]
```

The hex encoding clearly shows:
- `43` = ASCII for capital 'C'
- `20` = ASCII for space character
