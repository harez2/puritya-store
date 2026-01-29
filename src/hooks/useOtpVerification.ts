import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OtpSettings {
  otp_verification_enabled: boolean;
  otp_bypass_logged_in_users: boolean;
  otp_provider: 'bulksmsbd' | 'reve_system';
  otp_message_template: string;
  otp_expiry_minutes: number;
  // Provider credentials
  bulksms_api_key?: string;
  bulksms_sender_id?: string;
  reve_api_key?: string;
  reve_api_secret?: string;
  reve_sender_id?: string;
}

interface UseOtpVerificationReturn {
  isOtpEnabled: boolean;
  isOtpRequired: boolean;
  isVerified: boolean;
  verifiedPhone: string | null;
  loading: boolean;
  sending: boolean;
  verifying: boolean;
  error: string | null;
  resendCooldown: number;
  expiresAt: Date | null;
  sendOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, otpCode: string) => Promise<boolean>;
  resetVerification: () => void;
}

const SESSION_KEY = 'otp_session_id';
const VERIFIED_KEY = 'otp_verified_phone';

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

export function useOtpVerification(): UseOtpVerificationReturn {
  const [otpSettings, setOtpSettings] = useState<OtpSettings | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [userProfile, setUserProfile] = useState<{ phone: string | null } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if already verified in this session
  useEffect(() => {
    const storedPhone = sessionStorage.getItem(VERIFIED_KEY);
    if (storedPhone) {
      setIsVerified(true);
      setVerifiedPhone(storedPhone);
    }
  }, []);

  // Check auth status and fetch user profile
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setUserProfile(profile);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoggedIn(!!session?.user);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Fetch OTP settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'otp_settings')
          .maybeSingle();

        if (error) throw error;

        if (data?.value && typeof data.value === 'object') {
          const value = data.value as Record<string, unknown>;
          setOtpSettings({
            otp_verification_enabled: value.otp_verification_enabled === true,
            otp_bypass_logged_in_users: value.otp_bypass_logged_in_users !== false,
            otp_provider: (value.otp_provider as 'bulksmsbd' | 'reve_system') || 'bulksmsbd',
            otp_message_template: (value.otp_message_template as string) || 'Your verification code is: {otp}',
            otp_expiry_minutes: (value.otp_expiry_minutes as number) || 5,
            bulksms_api_key: value.bulksms_api_key as string | undefined,
            bulksms_sender_id: value.bulksms_sender_id as string | undefined,
            reve_api_key: value.reve_api_key as string | undefined,
            reve_api_secret: value.reve_api_secret as string | undefined,
            reve_sender_id: value.reve_sender_id as string | undefined,
          });
        } else {
          setOtpSettings({
            otp_verification_enabled: false,
            otp_bypass_logged_in_users: true,
            otp_provider: 'bulksmsbd',
            otp_message_template: 'Your verification code is: {otp}',
            otp_expiry_minutes: 5,
          });
        }
      } catch (err) {
        console.error('Error fetching OTP settings:', err);
        setOtpSettings({
          otp_verification_enabled: false,
          otp_bypass_logged_in_users: true,
          otp_provider: 'bulksmsbd',
          otp_message_template: 'Your verification code is: {otp}',
          otp_expiry_minutes: 5,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendOtp = useCallback(async (phone: string): Promise<boolean> => {
    if (!otpSettings) return false;

    setSending(true);
    setError(null);

    try {
      const sessionId = getSessionId();

      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          phone,
          session_id: sessionId,
          provider: otpSettings.otp_provider,
          otp_message_template: otpSettings.otp_message_template,
          otp_expiry_minutes: otpSettings.otp_expiry_minutes,
          bulksms_api_key: otpSettings.bulksms_api_key,
          bulksms_sender_id: otpSettings.bulksms_sender_id,
          reve_api_key: otpSettings.reve_api_key,
          reve_api_secret: otpSettings.reve_api_secret,
          reve_sender_id: otpSettings.reve_sender_id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setResendCooldown(60); // 60 seconds cooldown
        if (data.expires_at) {
          setExpiresAt(new Date(data.expires_at));
        }
        return true;
      } else {
        setError(data?.error || 'Failed to send OTP');
        return false;
      }
    } catch (err: unknown) {
      console.error('Error sending OTP:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(errorMessage);
      return false;
    } finally {
      setSending(false);
    }
  }, [otpSettings]);

  const verifyOtp = useCallback(async (phone: string, otpCode: string): Promise<boolean> => {
    setVerifying(true);
    setError(null);

    try {
      const sessionId = getSessionId();

      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          phone,
          otp_code: otpCode,
          session_id: sessionId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const verifiedPhoneNumber = data.verified_phone || phone;
        setIsVerified(true);
        setVerifiedPhone(verifiedPhoneNumber);
        sessionStorage.setItem(VERIFIED_KEY, verifiedPhoneNumber);
        return true;
      } else {
        setError(data?.error || 'Invalid OTP');
        return false;
      }
    } catch (err: unknown) {
      console.error('Error verifying OTP:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify OTP';
      setError(errorMessage);
      return false;
    } finally {
      setVerifying(false);
    }
  }, []);

  const resetVerification = useCallback(() => {
    setIsVerified(false);
    setVerifiedPhone(null);
    setError(null);
    setExpiresAt(null);
    sessionStorage.removeItem(VERIFIED_KEY);
  }, []);

  // Calculate if OTP is actually required (considering bypass for logged-in users)
  const canBypass = otpSettings?.otp_bypass_logged_in_users && isLoggedIn && !!userProfile?.phone;
  const isOtpRequired = (otpSettings?.otp_verification_enabled ?? false) && !canBypass && !isVerified;

  return {
    isOtpEnabled: otpSettings?.otp_verification_enabled ?? false,
    isOtpRequired,
    isVerified: isVerified || canBypass,
    verifiedPhone: verifiedPhone || (canBypass ? userProfile?.phone : null),
    loading,
    sending,
    verifying,
    error,
    resendCooldown,
    expiresAt,
    sendOtp,
    verifyOtp,
    resetVerification,
  };
}
