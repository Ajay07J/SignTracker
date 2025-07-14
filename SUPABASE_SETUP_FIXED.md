# Supabase Database Setup - FIXED VERSION

## ⚠️ IMPORTANT: Use this fixed version instead of the original setup

This document contains the corrected SQL schema that fixes all user creation issues.

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from the API settings

## Environment Setup

1. Copy `.env.example` to `.env`
2. Replace the placeholder values with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

## Database Schema - CORRECTED

Run the following SQL commands in your Supabase SQL editor:

### 1. Users Table (FIXED)
```sql
-- Drop table if it exists (for fresh start)
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with proper auth integration
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (FIXED)
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id);

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, employee_code, full_name, is_admin)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'employee_code',
    new.raw_user_meta_data->>'full_name',
    CASE 
      WHEN new.raw_user_meta_data->>'employee_code' IN ('0001', '0002', '0003', '0004') 
      THEN true 
      ELSE false 
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function whenever a user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Documents Table (UPDATED)
```sql
-- Drop table if it exists
DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  document_url TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view all documents" ON public.documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update documents" ON public.documents
  FOR UPDATE TO authenticated 
  USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );
```

### 3. Approvers Table (UPDATED)
```sql
-- Drop table if it exists
DROP TABLE IF EXISTS approvers CASCADE;

CREATE TABLE public.approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Enable RLS
ALTER TABLE public.approvers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approvers
CREATE POLICY "Users can view all approvers" ON public.approvers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Document creators can create approvers" ON public.approvers
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.documents WHERE id = document_id AND created_by = auth.uid())
  );

CREATE POLICY "Approvers can update their own records" ON public.approvers
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);
```

### 4. External Signers Table (UPDATED)
```sql
-- Drop table if it exists
DROP TABLE IF EXISTS external_signers CASCADE;

CREATE TABLE public.external_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected')),
  signed_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.external_signers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_signers
CREATE POLICY "Users can view all external signers" ON public.external_signers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Document creators can create external signers" ON public.external_signers
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.documents WHERE id = document_id AND created_by = auth.uid())
  );

CREATE POLICY "Document creators and admins can update external signers" ON public.external_signers
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id AND (
        d.created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
      )
    )
  );
```

### 5. Status Updates Table (UPDATED)
```sql
-- Drop table if it exists
DROP TABLE IF EXISTS status_updates CASCADE;

CREATE TABLE public.status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('created', 'approved', 'rejected', 'signing_started', 'signature_received', 'completed', 'general_update')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for status_updates
CREATE POLICY "Users can view all status updates" ON public.status_updates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create status updates" ON public.status_updates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = updated_by);
```

### 6. Update Triggers (UPDATED)
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON public.documents 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### 7. Storage Setup (SAME)
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true);

-- Storage policies
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view documents" ON storage.objects
  FOR SELECT TO authenticated 
  USING (bucket_id = 'documents');

CREATE POLICY "Users can update own documents" ON storage.objects
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'documents' AND auth.uid()::text = owner);

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated 
  USING (bucket_id = 'documents' AND auth.uid()::text = owner);
```

## ✅ Key Fixes Applied

1. **Proper Auth Integration**: Users table now properly references `auth.users(id)`
2. **Automatic Profile Creation**: Trigger automatically creates user profile on signup
3. **Correct RLS Policies**: Added INSERT policy for users table
4. **Admin Detection**: Automatic admin role assignment for codes 0001-0004
5. **Error Prevention**: Proper foreign key constraints and cascade deletes

## 🎯 How Admin Users Work Now

1. Sign up with employee codes **0001, 0002, 0003, or 0004**
2. User profile automatically created with `is_admin = true`
3. No manual SQL inserts needed!

## 🚀 Testing Instructions

1. Run the SQL above in Supabase SQL Editor
2. Go to your app signup page
3. Create user with employee code `0001` - should automatically get admin access
4. Create regular user with code `1234` - should get normal access
5. Check the users table to verify profiles were created correctly