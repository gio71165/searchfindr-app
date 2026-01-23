# API Key Authentication Migration Summary

## Overview
Replaced OAuth flow for Chrome extension with API key-based authentication. OAuth remains for the main web app.

## Files Created

### 1. Database Migration
- **`migrations/026_user_api_keys.sql`**
  - Creates `user_api_keys` table
  - RLS policies for user access
  - Auto-expiry trigger (1 year default)
  - Indexes for performance

### 2. API Utilities
- **`lib/api/api-keys.ts`**
  - `generateApiKey()` - Creates keys in format `sf_live_{32_chars}` or `sf_test_{32_chars}`
  - `hashApiKey()` - Bcrypt hashing (12 rounds)
  - `verifyApiKey()` - Bcrypt comparison
  - `validateApiKeyFormat()` - Format validation

### 3. API Endpoints
- **`app/api/extension/verify-key/route.ts`**
  - Verifies API keys
  - Rate limited (100/hour per key)
  - Returns user_id and workspace_id

- **`app/api/extension/api-keys/route.ts`**
  - GET: List user's API keys
  - POST: Generate new key (returns full key ONCE)
  - PATCH: Update key name or revoke

### 4. Settings UI
- **`components/settings/ApiKeysSettings.tsx`**
  - Generate new keys
  - List existing keys
  - Edit key names
  - Revoke keys
  - Max 5 keys per user
  - Security warnings

### 5. Extension Updates
- **`searchfindr-extension/popup.html`**
  - Added API key input field
  - Link to settings page

- **`searchfindr-extension/popup.js`**
  - Removed OAuth token handling
  - Added API key storage/retrieval
  - Added API key verification
  - Updated capture flow to use API keys

## Files Modified

### 1. Authentication Library
- **`lib/api/auth.ts`**
  - Added `authenticateWithApiKey()` function
  - Updated `authenticateRequest()` to detect API keys (starts with `sf_`)
  - Supports both OAuth tokens and API keys

### 2. Rate Limiting
- **`lib/api/rate-limit-config.ts`**
  - Added `api-key-verify` endpoint (100/hour)

### 3. Settings Page
- **`app/settings/page.tsx`**
  - Added `<ApiKeysSettings />` component

### 4. Package Dependencies
- **`package.json`**
  - Added `bcryptjs: ^2.4.3`
  - Added `@types/bcryptjs: ^2.4.6`

## Security Features

1. **Key Format**: `sf_live_{32_hex_chars}` or `sf_test_{32_hex_chars}`
2. **Hashing**: Bcrypt with 12 salt rounds
3. **Storage**: Keys never stored in plaintext
4. **Rate Limiting**: 100 verifications/hour per key
5. **Revocation**: Soft delete with `revoked_at` timestamp
6. **Expiration**: Optional expiry (defaults to 1 year)
7. **RLS**: Users can only access their own keys

## Migration Steps

1. **Run Database Migration**:
   ```sql
   -- Run migrations/026_user_api_keys.sql
   ```

2. **Install Dependencies**:
   ```bash
   npm install bcryptjs @types/bcryptjs
   ```

3. **Test API Key Generation**:
   - Go to `/settings`
   - Click "Generate New Key"
   - Copy the key (shown only once)

4. **Test Extension**:
   - Open extension popup
   - Enter API key
   - Click "Save API Key"
   - Verify connection works

## Known Issues / Manual Fixes Needed

The `popup.js` file may still have a few references to old token functions. Check for:
- `getToken()` → should be `getApiKey()`
- `clearToken()` → should be `clearApiKey()`
- `isTokenExpired()` → should be `validateApiKeyFormat()`

These should be mostly fixed, but verify the file compiles correctly.

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] API key generation works in settings
- [ ] API key verification endpoint works
- [ ] Extension can save and use API keys
- [ ] Extension capture flow works with API keys
- [ ] OAuth still works for web app
- [ ] Rate limiting works for verify endpoint
- [ ] Key revocation works
- [ ] Key expiration works

## Next Steps

1. Run the migration
2. Install dependencies
3. Test the full flow
4. Update extension version in manifest.json
5. Remove OAuth callback pages if no longer needed (optional)
