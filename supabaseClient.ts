import { createClient } from '@supabase/supabase-js';

// IMPORTANT: These are placeholder Supabase URL and Anon Key.
// Replace them with your actual Supabase project's URL and Anon Key.
const supabaseUrl = 'https://thxizfuhrwvxgtpluvnz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGl6ZnVocnd2eGd0cGx1dm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjQ0OTcsImV4cCI6MjA2NTUwMDQ5N30.TYKfsEgG1juqbQlMeNKma4LpIANLPOeIxm3iDSbgGss';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing. Please check your configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
