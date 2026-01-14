const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory user database (simulating real users)
const users = [
  { id: 1, username: 'alice', password: 'password123', email: 'alice@example.com' },
  { id: 2, username: 'bob', password: 'securepass', email: 'bob@example.com' },
  { id: 3, username: 'Charlie', password: 'charlie456', email: 'charlie@example.com' }, // Note: Capital C
  { id: 4, username: 'david ', password: 'david789', email: 'david@example.com' }, // Note: trailing space
  { id: 5, username: ' emma', password: 'emma321', email: 'emma@example.com' }, // Note: leading space
];

// Simple rate limiting store (in-memory)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ATTEMPTS = 3;

// Logging utility
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };

  console.log(JSON.stringify(logEntry));

  // Also write to file for persistence
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(data)}\n`;
  fs.appendFileSync('server.log', logLine);
}

// Rate limiting check
function checkRateLimit(identifier) {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || [];

  // Filter out old attempts
  const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((recentAttempts[0] + RATE_LIMIT_WINDOW - now) / 1000) };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - recentAttempts.length };
}

// Record login attempt
function recordAttempt(identifier) {
  const attempts = loginAttempts.get(identifier) || [];
  attempts.push(Date.now());
  loginAttempts.set(identifier, attempts);
}

// Clear rate limit (on successful login)
function clearRateLimit(identifier) {
  loginAttempts.delete(identifier);
}

// ============================================
// INTENTIONAL BUG: Case-sensitive username matching
// The bug: Username comparison is case-sensitive, BUT
// the database has mixed-case usernames that users don't expect.
// Additionally, some usernames have leading/trailing whitespace
// that was accidentally stored during registration.
//
// This causes "random" login failures because:
// 1. User "Charlie" registered with capital C, but types "charlie"
// 2. User "david " has a trailing space stored in DB
// 3. User " emma" has a leading space stored in DB
// ============================================

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

  log('info', 'Login attempt received', { username, clientIP });

  // Validate input
  if (!username || !password) {
    log('warn', 'Login failed - missing credentials', { username: username || 'empty', clientIP });
    return res.status(400).json({
      success: false,
      error: 'Username and password are required',
      code: 'MISSING_CREDENTIALS'
    });
  }

  // Check rate limit
  const rateCheck = checkRateLimit(clientIP);
  if (!rateCheck.allowed) {
    log('warn', 'Login blocked - rate limit exceeded', { username, clientIP, resetIn: rateCheck.resetIn });
    return res.status(429).json({
      success: false,
      error: `Too many login attempts. Try again in ${rateCheck.resetIn} seconds.`,
      code: 'RATE_LIMITED',
      resetIn: rateCheck.resetIn
    });
  }

  // Record this attempt
  recordAttempt(clientIP);

  // ============================================
  // THE BUG IS HERE: Direct comparison without normalization
  // This should use: username.toLowerCase().trim()
  // But it doesn't, causing "random" failures
  // ============================================
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    // Additional logging to help debug
    const usernameMatch = users.find(u => u.username.toLowerCase().trim() === username.toLowerCase().trim());

    if (usernameMatch) {
      // User exists but credentials don't match exactly
      log('warn', 'Login failed - credentials mismatch (possible case/whitespace issue)', {
        username,
        clientIP,
        hint: 'Username exists with different casing or whitespace',
        storedUsername: usernameMatch.username,
        storedUsernameLength: usernameMatch.username.length,
        providedUsernameLength: username.length
      });
    } else {
      log('warn', 'Login failed - user not found', { username, clientIP });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid username or password',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Successful login
  clearRateLimit(clientIP);

  // Generate a simple token (in production, use JWT)
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

  log('info', 'Login successful', { username, userId: user.id, clientIP });

  res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    },
    token
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to see users (for demonstration only)
app.get('/api/debug/users', (req, res) => {
  const sanitizedUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    usernameLength: u.username.length,
    usernameHex: Buffer.from(u.username).toString('hex'),
    email: u.email
  }));
  res.json(sanitizedUsers);
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize log file
fs.writeFileSync('server.log', `=== Server started at ${new Date().toISOString()} ===\n`);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('');
  console.log('Test users:');
  console.log('  alice / password123     - Works normally');
  console.log('  bob / securepass        - Works normally');
  console.log('  Charlie / charlie456    - Case-sensitive! (capital C)');
  console.log('  "david " / david789     - Has trailing space!');
  console.log('  " emma" / emma321       - Has leading space!');
  console.log('');
  console.log('Try logging in as "charlie" (lowercase) - it will fail!');
});
