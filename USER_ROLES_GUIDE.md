# User Roles Guide

## Understanding Roles

In SearchFindr, each user has **ONE primary role** stored in the `profiles.role` column:

- **`searcher`** - Default role. Users who search for deals and build their pipeline
- **`investor`** - Users who invest in searchers and monitor their pipelines
- **`admin`** - System administrators with full access

### Important Notes:

1. **One Role Per User**: A user can only have ONE role at a time (searcher, investor, or admin)
2. **Role vs Admin Flag**: There's also an `is_admin` boolean flag in the profiles table, but the `role` column is the primary way roles are managed
3. **Investor-Searcher Links**: Investors can be linked to multiple searchers through the `investor_searcher_links` table, allowing investors to see searcher pipelines

## How to Check Your Role

### Option 1: Run SQL Query

Run the `check_my_roles.sql` file and replace `YOUR_EMAIL@example.com` with your actual email:

```sql
SELECT 
  u.id,
  u.email,
  p.role,
  p.is_admin,
  p.workspace_id
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';
```

### Option 2: Check All Users

Run `check_user_roles.sql` to see all users and their roles.

## Creating a New Searcher Account

### Step 1: Create the Account
1. Sign up for a new account through the app's signup page
2. Use a different email address than your investor account
3. The account will automatically have `role = 'searcher'` (this is the default)

### Step 2: Verify the Role
After creating the account, verify it has the searcher role:

```sql
SELECT 
  u.email,
  p.role
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'new-searcher-email@example.com';
```

If the role is not 'searcher', update it:

```sql
UPDATE profiles
SET role = 'searcher'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'new-searcher-email@example.com'
);
```

## Linking a Searcher to Your Investor Account

### Option 1: Through the UI (Recommended)
1. Log in as your investor account
2. Go to `/investor` (Investor Dashboard)
3. Click "Link Searcher" button
4. Enter the searcher's email address
5. Select the workspace and access level
6. Click "Link"

### Option 2: Through SQL

1. First, get your investor ID and the searcher ID:

```sql
-- Get your investor ID
SELECT id, email FROM auth.users WHERE email = 'your-investor-email@example.com';

-- Get the searcher ID
SELECT id, email FROM auth.users WHERE email = 'searcher-email@example.com';

-- Get workspace_id (should be the same for both)
SELECT id, email, workspace_id FROM profiles 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('your-investor-email@example.com', 'searcher-email@example.com')
);
```

2. Then create the link:

```sql
INSERT INTO investor_searcher_links (
  investor_id,
  searcher_id,
  workspace_id,
  access_level,
  capital_committed
)
VALUES (
  'INVESTOR_USER_ID_HERE',
  'SEARCHER_USER_ID_HERE',
  'WORKSPACE_ID_HERE',
  'full',  -- or 'summary'
  NULL     -- optional: capital committed amount
);
```

## Changing Your Role

If you need to change your role (e.g., from searcher to investor):

```sql
-- Change to investor
UPDATE profiles
SET role = 'investor'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Change to searcher
UPDATE profiles
SET role = 'searcher'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Change to admin
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

**Note**: You can only have ONE role at a time. If you want to be both an investor and a searcher, you need to use **separate accounts**.

## Common Questions

### Q: Can I be both an investor and a searcher?
**A**: Not with the same account. You need separate accounts - one with `role = 'investor'` and another with `role = 'searcher'`. Then link them through the investor dashboard.

### Q: How do I know which role my account has?
**A**: Run the `check_my_roles.sql` script with your email, or check the Investor Dashboard - if you can access `/investor`, you're an investor.

### Q: What's the difference between `role` and `is_admin`?
**A**: 
- `role` is the primary role system (searcher/investor/admin)
- `is_admin` is a boolean flag that may be used for additional admin permissions
- For most purposes, use the `role` column

### Q: How do I see which searchers are linked to my investor account?
**A**: 
1. Go to `/investor` dashboard
2. Or run this SQL:

```sql
SELECT 
  searcher.email as searcher_email,
  isl.access_level,
  isl.capital_committed
FROM investor_searcher_links isl
JOIN auth.users inv ON isl.investor_id = inv.id
JOIN auth.users searcher ON isl.searcher_id = searcher.id
WHERE inv.email = 'your-investor-email@example.com';
```

## Files in This Guide

- `check_user_roles.sql` - View all users and their roles
- `check_my_roles.sql` - Check your specific user and relationships
- `add_searcher_to_investor.sql` - Step-by-step guide to link a searcher
- `temp_grant_investor_access.sql` - Template for granting investor access
