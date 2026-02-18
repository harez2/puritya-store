import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Check, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useOtpVerification } from '@/hooks/useOtpVerification';

interface OtpVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (phone: string) => void;
  initialPhone?: string;
}

type Step = 'phone' | 'otp' | 'verified';

export default function OtpVerificationModal({
  open,
  onOpenChange,
  onVerified,
  initialPhone = '',
}: OtpVerificationModalProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(initialPhone);
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const {
    sending,
    verifying,
    error,
    resendCooldown,
    expiresAt,
    sendOtp,
    verifyOtp,
  } = useOtpVerification();

  // Update phone when initialPhone changes
  useEffect(() => {
    if (initialPhone) {
      setPhone(initialPhone);
    }
  }, [initialPhone]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (expiresAt && step === 'otp') {
      const updateCountdown = () => {
        const now = new Date();
        const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
        setCountdown(diff);
      };

      updateCountdown();
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    }
  }, [expiresAt, step]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('phone');
        setOtpCode('');
      }, 300);
    }
  }, [open]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) return;
    
    const success = await sendOtp(phone.trim());
    if (success) {
      setStep('otp');
      setOtpCode('');
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const codeToVerify = code || otpCode;
    if (codeToVerify.length !== 6) return;

    const success = await verifyOtp(phone.trim(), codeToVerify);
    if (success) {
      setStep('verified');
      setTimeout(() => {
        onVerified(phone.trim());
        onOpenChange(false);
      }, 1500);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    await sendOtp(phone.trim());
    setOtpCode('');
  };

  const handleOtpComplete = (value: string) => {
    setOtpCode(value);
    if (value.length === 6) {
      // Auto-verify when 6 digits entered — pass value directly to avoid stale closure
      setTimeout(() => handleVerifyOtp(value), 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Phone Verification
          </DialogTitle>
          <DialogDescription>
            Verify your phone number to proceed with your order
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <motion.div
              key="phone-step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="otp-phone">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground">
                    +880
                  </div>
                  <Input
                    id="otp-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="1XXXXXXXXX"
                    className="rounded-l-none"
                    maxLength={11}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your Bangladesh mobile number
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                onClick={handleSendOtp}
                disabled={!phone.trim() || sending}
                className="w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Send OTP
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to
                </p>
                <p className="font-medium">+880 {phone}</p>
                {countdown > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Expires in {formatCountdown(countdown)}
                  </p>
                )}
              </div>

              <div className="flex justify-center py-4">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={handleOtpComplete}
                  disabled={verifying}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                onClick={() => handleVerifyOtp()}
                disabled={otpCode.length !== 6 || verifying}
                className="w-full"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>

              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || sending}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </Button>
              </div>

              <Button
                variant="link"
                size="sm"
                onClick={() => setStep('phone')}
                className="w-full"
              >
                Change phone number
              </Button>
            </motion.div>
          )}

          {step === 'verified' && (
            <motion.div
              key="verified-step"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"
              >
                <Check className="h-8 w-8 text-green-600" />
              </motion.div>
              <div>
                <h3 className="font-semibold text-lg">Verified!</h3>
                <p className="text-sm text-muted-foreground">
                  Your phone number has been verified
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
