# Testing Authentication - Verification Guide

## 🧪 How to Test the Fixed Authentication System

Follow these steps to verify everything is working correctly:

### Step 1: Verify Database Setup
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the complete SQL from `SUPABASE_SETUP_FIXED.md`
4. Check that all tables were created without errors

### Step 2: Test Admin User Creation
1. Start your application: `npm run dev`
2. Go to the signup page
3. Create a user with these details:
   ```
   Full Name: Test Admin
   Email: admin@test.com
   Employee Code: 0001
   Password: password123
   ```
4. Complete signup and login

### Step 3: Verify Admin User in Database
1. Go to Supabase Dashboard → Database → users table
2. You should see a new record with:
   - `email`: admin@test.com
   - `employee_code`: 0001
   - `is_admin`: true ✅
   - `full_name`: Test Admin

### Step 4: Test Regular User Creation
1. Sign out from the admin account
2. Create another user:
   ```
   Full Name: Regular User
   Email: user@test.com
   Employee Code: 1234
   Password: password123
   ```
3. Complete signup and login

### Step 5: Verify Regular User in Database
1. Check the users table again
2. The new record should have:
   - `email`: user@test.com
   - `employee_code`: 1234
   - `is_admin`: false ✅
   - `full_name`: Regular User

### Step 6: Test Admin Functionality
1. Login as the admin user (admin@test.com)
2. You should see an "Admin Panel" button in the dashboard
3. Regular users should NOT see this button

### Step 7: Test Document Creation
1. As any user, click "New Document"
2. Fill out the form and upload a test file
3. Select the admin user as an approver
4. Submit the document

### Step 8: Test Admin Approval
1. Login as admin user
2. Go to Admin Panel
3. You should see the pending document
4. Approve or reject it
5. Verify status changes correctly

## 🚨 Troubleshooting Common Issues

### Issue 1: "User profile not found" error
**Solution**: The database trigger might not be working
- Check if the trigger function was created correctly
- Verify the trigger is active in Database → Functions

### Issue 2: Admin users not getting admin access
**Solution**: Check employee code validation
- Ensure you're using exactly: 0001, 0002, 0003, or 0004
- Leading zeros are important!

### Issue 3: Authentication errors
**Solution**: Check environment variables
- Verify `.env` file has correct Supabase URL and anon key
- Restart development server after changes

### Issue 4: File upload issues
**Solution**: Check storage bucket
- Ensure 'documents' bucket exists
- Verify storage policies are applied

## ✅ Expected Behavior

### Signup Flow:
1. User fills signup form
2. Supabase Auth creates auth user
3. Database trigger automatically creates profile
4. Admin codes 0001-0004 get `is_admin = true`
5. User redirected to dashboard

### Login Flow:
1. User enters credentials
2. Auth checks credentials
3. Profile fetched from users table
4. Dashboard shows appropriate permissions

### Admin Features:
- Admin Panel access
- Document approval capabilities
- Can update external signer status

### Regular User Features:
- Create documents
- View all documents
- Update external signer status for own documents

## 🎯 Success Criteria

✅ Admin users can be created through signup (no SQL needed)
✅ Regular users get appropriate permissions
✅ Document workflow functions correctly
✅ All database operations work without RLS errors
✅ File uploads work properly

If all tests pass, your authentication system is working perfectly!