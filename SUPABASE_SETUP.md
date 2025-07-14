# Supabase Database Setup for Document Tracker

This document contains the SQL schema and setup instructions for the Document Tracker application.

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

## Database Schema

Run the following SQL commands in your Supabase SQL editor:

### 1. Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);
```

### 2. Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  document_url TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view all documents" ON documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create documents" ON documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update documents" ON documents
  FOR UPDATE TO authenticated 
  USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
```

### 3. Approvers Table
```sql
CREATE TABLE approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Enable RLS
ALTER TABLE approvers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approvers
CREATE POLICY "Users can view all approvers" ON approvers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Document creators can create approvers" ON approvers
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM documents WHERE id = document_id AND created_by = auth.uid())
  );

CREATE POLICY "Approvers can update their own records" ON approvers
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);
```

### 4. External Signers Table
```sql
CREATE TABLE external_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected')),
  signed_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE external_signers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_signers
CREATE POLICY "Users can view all external signers" ON external_signers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Document creators can create external signers" ON external_signers
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM documents WHERE id = document_id AND created_by = auth.uid())
  );

CREATE POLICY "Document creators and admins can update external signers" ON external_signers
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM documents d 
      WHERE d.id = document_id AND (
        d.created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
      )
    )
  );
```

### 5. Status Updates Table
```sql
CREATE TABLE status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES users(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('created', 'approved', 'rejected', 'signing_started', 'signature_received', 'completed', 'general_update')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for status_updates
CREATE POLICY "Users can view all status updates" ON status_updates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create status updates" ON status_updates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = updated_by);
```

### 6. Update Triggers
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 7. Storage Setup

Create a storage bucket for document files:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `documents`
3. Set it to public if you want direct access to files

Or run this SQL:
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

### 8. Insert Sample Admin Users (Optional)

```sql
-- Insert sample admin users (use this for testing)
-- Note: These users will need to sign up through the app to get proper auth records
INSERT INTO users (email, employee_code, full_name, is_admin) VALUES
  ('admin1@club.com', '0001', 'Admin One', true),
  ('admin2@club.com', '0002', 'Admin Two', true),
  ('admin3@club.com', '0003', 'Admin Three', true),
  ('admin4@club.com', '0004', 'Admin Four', true);
```

## Authentication Setup

The app uses Supabase Auth with email/password. The authentication flow:

1. Users sign up with email, password, employee code, and full name
2. If employee code is 0001-0004, they get admin privileges
3. User profile is automatically created in the users table
4. Row Level Security ensures proper data access

## Application Features

### User Roles
- **Regular Users**: Can create documents, view all documents, update status of external signers for their documents
- **Admin Users** (codes 0001-0004): All regular user permissions plus approve/reject documents

### Document Workflow
1. User creates document with file upload
2. Document goes to "pending_approval" status
3. Selected admin approvers review and approve/reject
4. If approved, document status becomes "in_progress"
5. Document creator updates external signer status as signatures are collected
6. When all external signers complete, document status becomes "completed"

### Key Features
- Real-time status tracking
- File upload to Supabase Storage
- Admin approval workflow
- External signer management
- Activity timeline
- Responsive design for mobile use

## Getting Started

1. Complete the database setup above
2. Set up your environment variables
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`
5. Create your first admin account using employee codes 0001-0004
6. Start creating and tracking documents!