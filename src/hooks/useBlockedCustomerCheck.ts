import { supabase } from '@/lib/supabase';

type BlockCheckParams = {
  email?: string;
  phone?: string;
  ipAddress?: string;
  deviceId?: string;
  blockingEnabled?: boolean;
};

type BlockCheckResult = {
  isBlocked: boolean;
  reason?: string;
  customMessage?: string;
};

export async function checkIfCustomerBlocked({ 
  email, 
  phone, 
  ipAddress,
  deviceId,
  blockingEnabled = true,
}: BlockCheckParams): Promise<BlockCheckResult> {
  // If blocking is disabled globally, don't check
  if (!blockingEnabled) {
    return { isBlocked: false };
  }

  try {
    // Normalize inputs
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = phone?.trim().replace(/\s/g, '');
    const normalizedIp = ipAddress?.trim();
    const normalizedDeviceId = deviceId?.trim();

    if (!normalizedEmail && !normalizedPhone && !normalizedIp && !normalizedDeviceId) {
      return { isBlocked: false };
    }

    // Execute separate queries for each identifier and combine results
    const results: any[] = [];
    const now = new Date().toISOString();

    if (normalizedEmail) {
      const { data: emailBlocks } = await supabase
        .from('blocked_customers')
        .select('id, reason, custom_message, expires_at')
        .eq('is_active', true)
        .eq('email', normalizedEmail);
      
      if (emailBlocks && emailBlocks.length > 0) {
        results.push(...emailBlocks);
      }
    }

    if (normalizedPhone) {
      const { data: phoneBlocks } = await supabase
        .from('blocked_customers')
        .select('id, reason, custom_message, expires_at')
        .eq('is_active', true)
        .eq('phone', normalizedPhone);
      
      if (phoneBlocks && phoneBlocks.length > 0) {
        results.push(...phoneBlocks);
      }
    }

    if (normalizedIp) {
      const { data: ipBlocks } = await supabase
        .from('blocked_customers')
        .select('id, reason, custom_message, expires_at')
        .eq('is_active', true)
        .eq('ip_address', normalizedIp);
      
      if (ipBlocks && ipBlocks.length > 0) {
        results.push(...ipBlocks);
      }
    }

    if (normalizedDeviceId) {
      const { data: deviceBlocks } = await supabase
        .from('blocked_customers')
        .select('id, reason, custom_message, expires_at')
        .eq('is_active', true)
        .eq('device_id', normalizedDeviceId);
      
      if (deviceBlocks && deviceBlocks.length > 0) {
        results.push(...deviceBlocks);
      }
    }

    // Filter out expired blocks and get the first valid one
    const activeBlocks = results.filter(block => {
      if (!block.expires_at) return true; // No expiry = permanent
      return new Date(block.expires_at) > new Date(now);
    });

    if (activeBlocks.length > 0) {
      const block = activeBlocks[0];
      return {
        isBlocked: true,
        reason: block.reason || 'Your account has been blocked.',
        customMessage: block.custom_message || undefined,
      };
    }

    return { isBlocked: false };
  } catch (error) {
    console.error('Error checking blocked customer:', error);
    // On error, allow checkout to proceed (fail-open for better UX)
    return { isBlocked: false };
  }
}
