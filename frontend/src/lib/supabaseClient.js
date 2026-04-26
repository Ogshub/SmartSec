import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://zkemyhvrbqgwozgowjfa.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprZW15aHZyYnFnd296Z293amZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjAyOTgsImV4cCI6MjA5MjYzNjI5OH0.DLEzB-IcP79cSAAfAkbjvUw_Gca842dB7MEEqcwrMno';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
