# Screenshots Index

Visual documentation of the incident reproduction.

---

## Screenshots

| # | File | Description |
|---|------|-------------|
| 1 | [01-failing-request-charlie.md](01-failing-request-charlie.md) | Case sensitivity bug - "charlie" vs "Charlie" |
| 2 | [02-successful-request-alice.md](02-successful-request-alice.md) | Working login (control case) |
| 3 | [03-server-logs.md](03-server-logs.md) | Server log analysis showing root cause hints |
| 4 | [04-failing-request-whitespace.md](04-failing-request-whitespace.md) | Whitespace bugs - "david " and " emma" |

---

## Summary of Bugs Documented

### Bug 1: Case Sensitivity
- **User:** charlie
- **Stored:** `Charlie` (capital C)
- **Provided:** `charlie` (lowercase)
- **Result:** 401 Unauthorized

### Bug 2: Trailing Whitespace
- **User:** david
- **Stored:** `david ` (6 chars, trailing space)
- **Provided:** `david` (5 chars)
- **Result:** 401 Unauthorized

### Bug 3: Leading Whitespace
- **User:** emma
- **Stored:** ` emma` (5 chars, leading space)
- **Provided:** `emma` (4 chars)
- **Result:** 401 Unauthorized

---

## How to Take Real Screenshots

If you need actual image screenshots:

### Browser (Chrome/Firefox)
1. Open http://localhost:3000
2. Open DevTools (F12)
3. Attempt login
4. Right-click → "Capture screenshot" or use Snipping Tool

### Terminal Logs
```bash
# Windows
# Use Snipping Tool or Win+Shift+S

# macOS
# Cmd+Shift+4 to select area

# Linux
# Use gnome-screenshot or scrot
```

### Recommended Screenshots to Capture
1. Browser showing failed login with debug panel visible
2. Browser showing successful login
3. Terminal with `tail -f server.log` showing the WARN messages
4. Output of `curl localhost:3000/api/debug/users`
