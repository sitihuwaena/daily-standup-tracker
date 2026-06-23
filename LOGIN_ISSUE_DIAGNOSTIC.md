# Daily Standup Tracker - Login Issue Diagnostic Brief

**Date:** 20 June 2026  
**Priority:** HIGH  
**Status:** Multiple fixes applied, requires verification

---

## Problem Summary

PM cannot login to Daily Standup Tracker despite correct credentials. Multiple underlying issues discovered and fixed during investigation.

---

## Environment Details

### Current Setup
- **Application:** Next.js 14.2.35 (standalone output)
- **Database:** PostgreSQL 16 (alpine)
- **Auth Library:** Lucia Auth v3.2.0
- **Password Hashing:** @node-rs/argon2
- **ORM:** Drizzle ORM v0.33.0
- **Container Runtime:** Docker Compose

### Port Configuration
- **App (Next.js):** Host 5777 → Container 3000
- **Database:** Host 5444 → Container 5432

### Default Credentials (from seed script)
- **Email:** `pm@gamatecha.com`
- **Password:** `ChangeMe123!`

---

## Issues Discovered & Fixed

### 1. ❌ CRITICAL: Login Endpoint Architecture Flaw

**File:** `app/api/auth/login/route.ts`

**Original Issue:**
```typescript
// OLD CODE - BROKEN
const backendUrl = process.env.BACKEND_URL || "http://localhost:3001"
const res = await fetch(`${backendUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
})
```

**Problem:**
- Login endpoint was **proxying** authentication requests to a separate backend server at `http://localhost:3001`
- This backend server **does not exist** in docker-compose.yml
- Resulted in **ECONNREFUSED** error on every login attempt
- Application has all auth infrastructure (Lucia + Drizzle) but wasn't using it

**Fix Applied (Commit 1d302f4):**
- Rewrote login endpoint to handle authentication **directly**
- Uses existing Lucia auth + Drizzle setup
- Queries `auth_user` table directly
- Verifies password with argon2
- Creates session and sets session cookie
- **No external backend dependency**

---

### 2. ❌ Password Verification Config Mismatch

**File:** `app/api/auth/login/route.ts`

**Issue:**
First fix attempt used custom argon2 config that didn't match seed script:
```typescript
// WRONG - custom config
const validPassword = await verify(user.hashed_password, password, {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
})
```

But seed script uses **default config**:
```typescript
// scripts/seed.ts
const hashedPassword = await hash(PM_PASSWORD) // uses defaults
```

**Fix Applied (Commit 9865350):**
```typescript
// CORRECT - use default config to match seed
const validPassword = await verify(user.hashed_password, password)
```

---

### 3. ❌ Database Connection String

**File:** `docker-compose.yml`

**Issue:**
DATABASE_URL password was literally set to `***` instead of actual password:
```yaml
# WRONG
DATABASE_URL: postgresql://standup_user:***@db:5432/standup_db
```

**Fix Applied (Commit 4bd9460):**
```yaml
# CORRECT
DATABASE_URL: postgresql://standup_user:standup_pass@db:5432/standup_db
```

---

### 4. ✅ Build Configuration Issues (Pre-existing)

**Multiple fixes applied:**
- Removed non-existent `/app/public` directory copy from Dockerfile
- Converted `next.config.ts` → `next.config.mjs` (Next.js 14.2.35 doesn't support .ts config)
- Removed nginx service (app now exposes port directly)

---

## Database Setup Requirements

### Required Commands (in order)

```bash
# 1. Generate and push schema to database
docker compose exec app npm run db:push

# 2. Seed PM account
docker compose exec app npm run seed
```

### Expected Output from Seed

```
Seeding PM account...
PM account seeded: pm@gamatecha.com
```

### Verify Database

```bash
# Connect to database
docker compose exec db psql -U standup_user -d standup_db

# Check if user exists
SELECT id, email FROM auth_user;

# Expected result:
#        id         |       email        
# ------------------+-------------------
#  (15-char ID)     | pm@gamatecha.com
```

---

## Current Code State

### Login Flow (Correct Implementation)

**POST `/api/auth/login`**

1. Receives `{ email, password }` from client
2. Normalizes email to lowercase
3. Queries database: `SELECT * FROM auth_user WHERE email = ?`
4. Verifies password with argon2 (default config)
5. Creates Lucia session: `lucia.createSession(user.id, {})`
6. Sets session cookie in response
7. Returns `{ ok: true }`

### Session Cookie Configuration

```typescript
lucia.createSessionCookie(session.id)
// Creates httpOnly cookie with:
// - name: defined by Lucia
// - httpOnly: true
// - sameSite: 'lax'
// - secure: true (production only)
// - path: '/'
```

---

## Verification Steps

### 1. Pull Latest Changes
```bash
git pull origin main
```

### 2. Rebuild Containers
```bash
docker compose down
docker compose up --build -d
```

### 3. Check Containers Running
```bash
docker compose ps
# Both 'db' and 'app' should be Up
```

### 4. Setup Database
```bash
# Generate schema
docker compose exec app npm run db:push

# Seed PM account
docker compose exec app npm run seed
```

### 5. Check Application Logs
```bash
docker compose logs app -f
```

Look for:
- ✅ `✓ Ready in XXXms`
- ❌ `TypeError: fetch failed` (should NOT appear)
- ❌ `ECONNREFUSED` (should NOT appear)

### 6. Test Login

**URL:** `http://localhost:5777/login`

**Credentials:**
- Email: `pm@gamatecha.com`
- Password: `ChangeMe123!`

**Expected Behavior:**
- Login form submits
- No errors in browser console
- Redirect to `/pm/dashboard`
- Session cookie is set

**Debug Login Failures:**

```bash
# Check app logs during login attempt
docker compose logs app --tail 50

# Check database connection
docker compose exec app npm run db:push
# Should succeed without errors

# Verify PM account exists
docker compose exec db psql -U standup_user -d standup_db -c "SELECT email FROM auth_user;"
```

---

## Potential Remaining Issues

### If Login Still Fails After All Fixes:

1. **Database not seeded:**
   - Run `docker compose exec app npm run seed`
   - Verify with database query

2. **Session cookie not being set:**
   - Check browser DevTools → Application → Cookies
   - Look for Lucia session cookie
   - Check if httpOnly flag prevents JS access

3. **Email case sensitivity:**
   - Seed script uses `email.toLowerCase()`
   - Login endpoint uses `email.toLowerCase()`
   - Should match, but verify database has lowercase email

4. **Password special characters:**
   - Default password is `ChangeMe123!`
   - Ensure no encoding issues with `!` character
   - Test with simpler password if needed

5. **Container networking:**
   - App container must be able to reach db container
   - Check `docker compose logs db`
   - Verify DATABASE_URL in app environment

---

## Testing Checklist

- [ ] Pull latest code from main branch
- [ ] Rebuild containers (`docker compose up --build -d`)
- [ ] Run `npm run db:push` inside app container
- [ ] Run `npm run seed` inside app container
- [ ] Verify PM account exists in database
- [ ] Access `http://localhost:5777/login`
- [ ] Enter credentials: `pm@gamatecha.com` / `ChangeMe123!`
- [ ] Login succeeds and redirects to dashboard
- [ ] Session cookie is set in browser
- [ ] Refresh page maintains session

---

## Files Modified (Commit History)

1. **Dockerfile** - Removed public directory copy
2. **next.config.ts → next.config.mjs** - Fixed config format
3. **docker-compose.yml** - Fixed DATABASE_URL password, ports
4. **app/api/auth/login/route.ts** - Complete rewrite (2 commits)

### Latest Commits on Main Branch:
- `9865350` - fix: use default argon2 config for password verification
- `1d302f4` - fix: rewrite login endpoint to use Lucia auth directly
- `4bd9460` - fix: correct DATABASE_URL password in docker-compose
- `7d439ae` - chore: change app port mapping to 5777
- `cdf1b0c` - chore: remove nginx service from docker-compose
- `2e9b6de` - chore: change database port mapping to 5444
- `98e639a` - fix: convert next.config.ts to next.config.mjs
- `1749202` - fix: remove conflicting next.config.mjs
- `1a42e4d` - fix: remove non-existent public directory from Dockerfile

---

## Support & Contact

If login still fails after applying all fixes and verification steps, please provide:

1. Output of `docker compose logs app --tail 100`
2. Output of `docker compose exec app npm run seed`
3. Browser console errors (F12 → Console tab)
4. Network tab showing `/api/auth/login` request/response
5. Database verification: `SELECT * FROM auth_user;`

---

**End of Diagnostic Brief**
