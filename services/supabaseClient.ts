import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yvuwoswxqjdmdpxubhth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dXdvc3d4cWpkbWRweHViaHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTE0NDYsImV4cCI6MjA4MDM4NzQ0Nn0.Eo9khFmM6iJsEpxy6fAIxHqXpNIsQ1HoIBSmPE-8ru4';

export const supabase = createClient(supabaseUrl, supabaseKey);