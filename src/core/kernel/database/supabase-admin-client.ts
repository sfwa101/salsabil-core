// src/core/kernel/database/supabase-admin-client.ts
// عميل Supabase بمفتاح service_role — خادم فقط، يتجاوز RLS بالكامل
// لا يُستورَد إطلاقاً في أي Client Component ('use client') — حزمة server-only تفرض هذا وقت البناء

import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase admin environment variables: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
