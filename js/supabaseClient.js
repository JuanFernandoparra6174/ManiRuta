import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.6/+esm";

const SUPABASE_URL = "https://ruunbwmuizhaetgubzjt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dW5id211aXpoYWV0Z3Viemp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NzA4MzEsImV4cCI6MjA4NjE0NjgzMX0.J4tT9MGg82Syzn1GexnHIZtsGUrazjKEvBeUrgE2Tws";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
