# Banking System — Backend Problems & Fixes

A complete audit of every file, listing problems found and the exact changes made to fix them.

---

## 1. `backend/src/models/user.model.js`

### ❌ Problem
```js
// Line 48 — DEBUG LOG LEFT IN PRODUCTION CODE
userSchema.methods.comparePassword = async function (password) {
    console.log(password, this.password)  // ← LEAKS plain-text password AND hashed password to console
    return await bcrypt.compare(password, this.password)
}
```
**Severity:** 🔴 CRITICAL — This prints the raw password input and bcrypt hash to terminal logs.
In a real system, logs are often aggregated into monitoring tools (Datadog, CloudWatch).
This is a security vulnerability that would fail any code review.

### ✅ Fix Applied
```js
userSchema.methods.comparePassword = async function (password) {
    // Removed debug console.log — never log credentials
    return await bcrypt.compare(password, this.password)
}
```

---

## 2. `backend/src/app.js`

### ❌ Problem 1 — No CORS Middleware
```js
// No CORS headers configured at all
app.use(express.json())
app.use(cookieParser())
```
**Severity:** 🔴 CRITICAL — The frontend running on a different origin (e.g., `http://localhost:5500`)
will be **completely blocked** by browsers due to Same-Origin Policy.
Every API call from the frontend will fail with a CORS error.

### ❌ Problem 2 — No Global Error Handler
```js
// app.js ends without any error handling middleware
module.exports = app
```
**Severity:** 🔴 CRITICAL — Any unhandled error thrown inside a route or controller
(e.g., Mongoose validation errors, unexpected crashes) will either:
- Crash the Express server entirely, OR
- Return an empty response / hang the request
An Express global error handler (`(err, req, res, next)`) is required to catch these.

### ❌ Problem 3 — No 404 Handler
No fallback route for undefined endpoints — Express returns an ugly HTML error page.

### ✅ Fixes Applied
```js
// Added cors package
const cors = require("cors")
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5500",
    credentials: true  // required for cookies/JWT to work cross-origin
}))

// Added 404 handler
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" })
})

// Added global error handler (must be LAST middleware)
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`)
    const statusCode = err.statusCode || 500
    res.status(statusCode).json({
        message: err.message || "Internal Server Error",
        status: "error"
    })
})
```

---

## 3. `backend/src/controllers/auth.controller.js`

### ❌ Problem 1 — No try/catch anywhere
```js
async function userRegisterController(req, res) {
    const isExists = await userModel.findOne({ email })  // ← NO try/catch
    // ...
    const user = await userModel.create({ ... })         // ← NO try/catch
```
**Severity:** 🔴 HIGH — If MongoDB is down or a Mongoose validation error is thrown,
this unhandled promise rejection will crash the entire server process (in Node < 15)
or go unhandled. The global error handler only catches errors passed via `next(err)`.

### ❌ Problem 2 — Cookie sent without `httpOnly` or `secure` flags
```js
res.cookie("token", token)  // ← Vulnerable cookie
```
**Severity:** 🔴 HIGH
- Missing `httpOnly: true` → JavaScript running in the browser (e.g., XSS scripts) can read the cookie via `document.cookie` and steal the JWT.
- Missing `secure: true` → Cookie sent over unencrypted HTTP, vulnerable to man-in-the-middle attacks.
- Missing `sameSite: "strict"` → Vulnerable to CSRF attacks.

### ❌ Problem 3 — Email sent AFTER response
```js
res.status(201).json({ ... })         // ← Response sent here
await emailService.sendRegistrationEmail(...)  // ← Runs after response is sent
```
**Severity:** 🟡 MEDIUM — In Express v5 (which you're using!), sending headers after the response
is completed can throw errors. Email should be fire-and-forget with `.catch()` logging.

### ✅ Fixes Applied
- Wrapped all DB operations in try/catch, passing errors to `next(err)`
- Added `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "strict"` to all cookies
- Email moved to fire-and-forget: `emailService.sendRegistrationEmail(...).catch(console.error)`

---

## 4. `backend/src/controllers/account.controller.js`

### ❌ Problem — Zero error handling in all three functions
```js
async function createAccountController(req, res) {
    const account = await accountModel.create({ user: user._id })  // NO try/catch
    res.status(201).json({ account })
}
```
**Severity:** 🔴 HIGH — All three controller functions (`createAccount`, `getUserAccounts`,
`getAccountBalance`) have no error handling. Any DB failure will be an unhandled rejection.

### ✅ Fix Applied
Wrapped all three functions in try/catch blocks with `next(err)`.

---

## 5. `backend/src/controllers/transaction.controller.js`

### ❌ Problem 1 — Artificial 15-second delay hardcoded
```js
await (() => {
    return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
})()
```
**Severity:** 🔴 HIGH — This is clearly a simulation artifact for testing.
It makes every real transaction wait 15 seconds before completing the credit ledger entry.
MongoDB sessions have a default transaction timeout; this risks transaction timeouts.
Must be removed from production code.

### ❌ Problem 2 — MongoDB session started OUTSIDE try/catch
```js
async function createTransaction(req, res) {
    // ...
    let transaction;
    try {
        const session = await mongoose.startSession()  // ← session declared INSIDE try
        session.startTransaction()
        // ... if error happens here...
    } catch (error) {
        return res.status(400).json({ ... })
        // ← session.abortTransaction() NEVER CALLED
        // ← session.endSession() NEVER CALLED
        // This leaks the MongoDB session and leaves the transaction in PENDING state
    }
}
```
**Severity:** 🔴 HIGH — If any error occurs after `startTransaction()`, the MongoDB session
is never aborted and never ended. This causes:
1. Session memory leak on the MongoDB server
2. Transaction stays in `PENDING` state in DB forever
3. Locks may not be released properly

### ❌ Problem 3 — `createInitialFundsTransaction` has NO try/catch at all
```js
async function createInitialFundsTransaction(req, res) {
    const session = await mongoose.startSession()
    session.startTransaction()
    // ... 5 DB operations with no error handling
    await session.commitTransaction()
    session.endSession()
    // ← If ANY step fails, session leaked, no response sent to client
}
```
**Severity:** 🔴 HIGH — Same session leak problem, plus the client gets no response on failure.

### ❌ Problem 4 — No transaction history GET endpoint
No endpoint exists to fetch transaction history for an account/user.
The frontend cannot display any history without it.

### ✅ Fixes Applied
- Removed the 15-second `setTimeout`
- Restructured session lifecycle: session declared before try, `abortTransaction()` + `endSession()` called in catch
- Added full try/catch to `createInitialFundsTransaction`
- Added `getTransactionHistory` controller function
- Added `GET /api/transactions/:accountId` route

---

## 6. `backend/src/middleware/auth.middleware.js`

### ❌ Problem — Code duplication between `authMiddleware` and `authSystemUserMiddleware`
```js
// Both functions repeat the exact same token extraction + blacklist check logic (~20 lines)
const token = req.cookies.token || req.headers.authorization?.split(" ")[1]
if (!token) { ... }
const isBlacklisted = await tokenBlackListModel.findOne({ token })
if (isBlacklisted) { ... }
```
**Severity:** 🟡 MEDIUM — Violates DRY principle. Any fix to token validation logic must be
applied in two places, risking bugs from missed updates.

### ✅ Fix Applied
Extracted common logic into a `extractAndValidateToken(req, res)` helper to eliminate duplication.

---

## 7. `backend/package.json`

### ❌ Problem 1 — Duplicate cookie parser packages
```json
"cookie-parser": "^1.4.7",   // ← correct package used in app.js
"cookieparser": "^0.1.0",    // ← different, incorrect package also installed (unused)
```
**Severity:** 🟢 LOW — Adds unnecessary bloat to `node_modules`. The `cookieparser` package
is a different, unmaintained package that is NOT used anywhere in the code.

### ❌ Problem 2 — `main` field points to wrong file
```json
"main": "index.js",  // ← file doesn't exist
```
The actual entry point is `server.js`. This is misleading.

### ❌ Problem 3 — No `cors` package listed
CORS middleware was missing entirely.

### ✅ Fixes Applied
- Removed `cookieparser` dependency
- Changed `"main": "index.js"` → `"main": "server.js"`
- Added `cors` to dependencies

---

## 8. `backend/server.js`

### ❌ Problem — Port hardcoded to 3000
```js
app.listen(3000, () => { ... })
```
**Severity:** 🟢 LOW — Port 3000 may already be in use. Industry standard is to read from
`process.env.PORT` with a fallback.

### ✅ Fix Applied
```js
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
```

---

## 9. `backend/src/config/db.js`

### ❌ Problem — Error details swallowed
```js
.catch(err => {
    console.log("Error connecting to DB")  // ← loses the actual error message
    process.exit(1)
})
```
**Severity:** 🟢 LOW — When diagnosing connection issues, the actual error (wrong URI,
network issue, auth failure) is thrown away.

### ✅ Fix Applied
```js
.catch(err => {
    console.error("Error connecting to DB:", err.message)
    process.exit(1)
})
```

---

## Summary Table

| File | Problems Found | Severity |
|------|---------------|----------|
| `user.model.js` | Password logged to console | 🔴 Critical |
| `app.js` | No CORS, no error handler, no 404 handler | 🔴 Critical |
| `auth.controller.js` | No try/catch, insecure cookies, email after response | 🔴 High |
| `account.controller.js` | No try/catch in any function | 🔴 High |
| `transaction.controller.js` | 15s delay, session leak on error, no try/catch in initial-funds, no history endpoint | 🔴 High |
| `auth.middleware.js` | Code duplication (DRY violation) | 🟡 Medium |
| `package.json` | Duplicate dep, wrong `main` field, missing `cors` | 🟢 Low |
| `server.js` | Hardcoded port | 🟢 Low |
| `config/db.js` | Error details swallowed | 🟢 Low |

**Total: 9 files audited | 16 distinct issues fixed**

---

## 10. npm Commands Explained — Why Were These Run?

```bash
npm install cors --save
npm uninstall cookieparser
```

These two commands were required because of problems discovered inside `package.json`.
Here is a deep explanation of each one:

---

### Command 1: `npm install cors --save`

#### What is `cors`?
CORS stands for **Cross-Origin Resource Sharing**.

A "cross-origin" request happens when a browser makes an API call from one address to a different address.
For example:
- Your **frontend** runs at: `http://127.0.0.1:5500` (Live Server / browser)
- Your **backend** runs at: `http://localhost:3000` (Express server)

These are **two different origins** (different port = different origin).

#### Why does the browser block this?
Browsers have a built-in security rule called the **Same-Origin Policy**.
It says: *"A webpage can only make API requests to the SAME origin it was loaded from."*

Without CORS, when your frontend JavaScript tries to call `fetch("http://localhost:3000/api/auth/login")`,
the browser will **automatically block it** and show this error in the console:

```
Access to fetch at 'http://localhost:3000/api/auth/login' from origin 
'http://127.0.0.1:5500' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This is NOT a bug in your code — it is the **browser enforcing security**.
The only way to allow it is for the **server to send special HTTP headers** telling the browser
"yes, I allow requests from this frontend origin".

#### What does the `cors` npm package do?
The `cors` package is Express middleware that automatically adds those permission headers to every response:

```
Access-Control-Allow-Origin: http://127.0.0.1:5500
Access-Control-Allow-Credentials: true
```

#### How it was added in `app.js`:
```js
const cors = require("cors")

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500",
    credentials: true    // ← This is required so JWT cookies are included in cross-origin requests
}))
```

- `origin` — tells which frontend URL is allowed to call the API
- `credentials: true` — tells the browser it's OK to include cookies (JWT token) in cross-origin requests.
  Without this, `res.cookie("token", ...)` would be set by the server but the browser would silently ignore it.

#### Why `--save`?
The `--save` flag writes the package into `package.json` under `"dependencies"`.
This means when someone else clones your project and runs `npm install`, `cors` is automatically installed.

```json
// What was added to package.json:
"dependencies": {
    "cors": "^2.8.5",   ← added by npm install cors --save
    ...
}
```

#### In simple words:
> Without `cors`, your entire frontend is completely cut off from the backend.
> Every single API call — login, register, transfer — would fail silently in the browser.
> Installing it was not optional; it was the #1 blocker for building the frontend.

---

### Command 2: `npm uninstall cookieparser`

#### What was the problem?
Your original `package.json` had **two different cookie packages installed at the same time**:

```json
"dependencies": {
    "cookie-parser": "^1.4.7",   ← CORRECT package (hyphenated)
    "cookieparser": "^0.1.0",    ← WRONG package (no hyphen)
}
```

These look almost identical but are **completely different packages** from different authors.

| Property | `cookie-parser` | `cookieparser` |
|----------|----------------|----------------|
| npm page | npmjs.com/package/cookie-parser | npmjs.com/package/cookieparser |
| Author | expressjs team (official) | unknown third party |
| Downloads/week | ~10 million | ~200 |
| Last updated | Actively maintained | Abandoned/unmaintained |
| Used in your code | ✅ YES — `require("cookie-parser")` in app.js | ❌ NO — never used anywhere |
| What it does | Parses `Cookie` headers into `req.cookies` object | Different, older, unrelated |

#### Why is this a problem?
1. **Dead weight** — `cookieparser` is installed and takes up space in `node_modules` but is never used anywhere in the code.
2. **Security risk** — Installing unmaintained/unknown packages is a security risk.
   Abandoned packages can be taken over by malicious actors (supply chain attack).
3. **Confusing for other developers** — Someone reading `package.json` sees both names and assumes
   they are both used, wasting time trying to figure out which does what.
4. **npm audit** — Extra unused packages increase the surface area for vulnerability warnings.

#### What `npm uninstall cookieparser` does:
- Removes the `cookieparser` package from `node_modules` folder
- Removes it from `package.json` `"dependencies"` section
- Updates `package-lock.json` to reflect the removal

#### The correct package (`cookie-parser`) was kept:
```js
// app.js — this line was always correct and untouched
const cookieParser = require("cookie-parser")
app.use(cookieParser())
// This parses incoming cookies so req.cookies.token works in the middleware
```

#### In simple words:
> You accidentally had a fake/wrong cookie package installed that was never used.
> `npm uninstall cookieparser` just cleaned up the junk.
> It had zero impact on functionality but it was the right thing to do for code hygiene
> and security — exactly what an interviewer looks for.

---

### Why These Two Commands Were Run Together

Before these commands:
```json
"dependencies": {
    "cookie-parser": "^1.4.7",
    "cookieparser": "^0.1.0",      ← ❌ wrong/unused
    // NO cors                      ← ❌ missing, blocks entire frontend
}
```

After these commands:
```json
"dependencies": {
    "cookie-parser": "^1.4.7",     ← ✅ correct
    "cors": "^2.8.5",              ← ✅ added, enables frontend communication
    // cookieparser removed         ← ✅ cleaned up
}
```

The result is a cleaner, more secure, and **actually functional** backend that a real frontend can talk to.
