import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to check if employee code is admin
export const isAdminCode = (employeeCode: string): boolean => {
  const adminCodes = ['0001', '0002', '0003', '0004'];
  return adminCodes.includes(employeeCode);
};

// Upload file to Supabase storage
export const uploadFile = async (file: File, bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file);

  if (error) throw error;
  return data;
};

// Get public URL for uploaded file
export const getFileUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// FIXED: Auth helpers with automatic profile creation
export const signUp = async (email: string, password: string, employeeCode: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        employee_code: employeeCode,
        full_name: fullName,
      }
    }
  });

  if (error) throw error;

  // Note: User profile will be automatically created by database trigger
  // No need to manually insert into users table anymore!
  
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};