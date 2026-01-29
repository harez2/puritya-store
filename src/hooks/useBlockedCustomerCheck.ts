import { supabase } from '@/lib/supabase';

type BlockCheckParams = {
  email?: string;
  phone?: string;
};

type BlockCheckResult = {
  isBlocked: boolean;
  reason?: string;
};

export async function checkIfCustomerBlocked({ email, phone }: BlockCheckParams): Promise<BlockCheckResult> {
  try {
    // Normalize inputs
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.trim().replace(/\s/g, '');

    if (!normalizedEmail && !normalizedPhone) {
      return { isBlocked: false };
    }

    // Build query to check blocked_customers table
    // We need to check if any active block exists for this email or phone
    let query = supabase
      .from('blocked_customers')
      .select('id, reason, email, phone')
      .eq('is_active', true);

    // Use OR condition for email and phone
    const conditions: string[] = [];
    if (normalizedEmail) {
      conditions.push(`email.eq.${normalizedEmail}`);
    }
    if (normalizedPhone) {
      conditions.push(`phone.eq.${normalizedPhone}`);
    }

    // Execute separate queries for each condition and combine results
    const results: any[] = [];

    if (normalizedEmail) {
      const { data: emailBlocks } = await supabase
        .from('blocked_customers')
        .select('id, reason, email, phone')
        .eq('is_active', true)
        .eq('email', normalizedEmail);
      
      if (emailBlocks && emailBlocks.length > 0) {
        results.push(...emailBlocks);
      }
    }

    if (normalizedPhone) {
      const { data: phoneBlocks } = await supabase
        .from('blocked_customers')
        .select('id, reason, email, phone')
        .eq('is_active', true)
        .eq('phone', normalizedPhone);
      
      if (phoneBlocks && phoneBlocks.length > 0) {
        results.push(...phoneBlocks);
      }
    }

    if (results.length > 0) {
      // Return the first matching block reason
      return {
        isBlocked: true,
        reason: results[0].reason || 'Your account has been blocked.',
      };
    }

    return { isBlocked: false };
  } catch (error) {
    console.error('Error checking blocked customer:', error);
    // On error, allow checkout to proceed (fail-open for better UX)
    return { isBlocked: false };
  }
}
