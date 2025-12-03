// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lseosbhizykxkkhhseqz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZW9zYmhpenlreGtraGhzZXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4ODAzMjIsImV4cCI6MjA3MzQ1NjMyMn0.UTHx_nVqwF6CsCGAQ6xrHuMquRKErP6M-pKwxKkKK8Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)