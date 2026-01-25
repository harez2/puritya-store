import { Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react';

interface PaymentMethodIconProps {
  type: string;
  className?: string;
}

// Payment method brand colors and icons
const paymentBrands: Record<string, { 
  icon?: React.ReactNode; 
  logo?: string; 
  bgColor: string; 
  textColor: string;
  label: string;
}> = {
  bkash: {
    logo: 'https://www.bkash.com/sites/all/themes/flavor/logo.png',
    bgColor: '#E2136E',
    textColor: 'white',
    label: 'bKash',
  },
  bkash_gateway: {
    logo: 'https://www.bkash.com/sites/all/themes/flavor/logo.png',
    bgColor: '#E2136E',
    textColor: 'white',
    label: 'bKash',
  },
  nagad: {
    bgColor: '#F6921E',
    textColor: 'white',
    label: 'Nagad',
  },
  uddoktapay: {
    bgColor: '#6366F1',
    textColor: 'white',
    label: 'UddoktaPay',
  },
  sslcommerz: {
    bgColor: '#1a73e8',
    textColor: 'white',
    label: 'SSL',
  },
  cod: {
    icon: <Banknote className="w-4 h-4" />,
    bgColor: 'hsl(var(--muted))',
    textColor: 'hsl(var(--muted-foreground))',
    label: 'COD',
  },
  card: {
    icon: <CreditCard className="w-4 h-4" />,
    bgColor: 'hsl(var(--muted))',
    textColor: 'hsl(var(--muted-foreground))',
    label: 'Card',
  },
  other: {
    icon: <Wallet className="w-4 h-4" />,
    bgColor: 'hsl(var(--muted))',
    textColor: 'hsl(var(--muted-foreground))',
    label: 'Other',
  },
};

export function PaymentMethodIcon({ type, className = '' }: PaymentMethodIconProps) {
  const brand = paymentBrands[type] || paymentBrands.other;

  // For bKash - use inline SVG logo
  if (type === 'bkash' || type === 'bkash_gateway') {
    return (
      <div 
        className={`flex items-center justify-center rounded-md ${className}`}
        style={{ backgroundColor: brand.bgColor, width: 36, height: 24 }}
      >
        <span className="text-white font-bold text-xs tracking-tight">bKash</span>
      </div>
    );
  }

  // For Nagad
  if (type === 'nagad') {
    return (
      <div 
        className={`flex items-center justify-center rounded-md ${className}`}
        style={{ backgroundColor: brand.bgColor, width: 36, height: 24 }}
      >
        <span className="text-white font-bold text-xs tracking-tight">Nagad</span>
      </div>
    );
  }

  // For UddoktaPay
  if (type === 'uddoktapay') {
    return (
      <div 
        className={`flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 ${className}`}
        style={{ width: 36, height: 24 }}
      >
        <Smartphone className="w-3.5 h-3.5 text-white" />
      </div>
    );
  }

  // For SSLCommerz
  if (type === 'sslcommerz') {
    return (
      <div 
        className={`flex items-center justify-center rounded-md ${className}`}
        style={{ backgroundColor: brand.bgColor, width: 36, height: 24 }}
      >
        <CreditCard className="w-3.5 h-3.5 text-white" />
      </div>
    );
  }

  // Default icon-based display
  return (
    <div 
      className={`flex items-center justify-center rounded-md bg-muted ${className}`}
      style={{ width: 36, height: 24 }}
    >
      {brand.icon || <Wallet className="w-3.5 h-3.5 text-muted-foreground" />}
    </div>
  );
}

export function PaymentMethodBadge({ type, className = '' }: PaymentMethodIconProps) {
  const brand = paymentBrands[type] || paymentBrands.other;

  const getBgClass = () => {
    switch (type) {
      case 'bkash':
      case 'bkash_gateway':
        return 'bg-[#E2136E]';
      case 'nagad':
        return 'bg-[#F6921E]';
      case 'uddoktapay':
        return 'bg-gradient-to-r from-indigo-500 to-purple-600';
      case 'sslcommerz':
        return 'bg-[#1a73e8]';
      default:
        return 'bg-muted';
    }
  };

  const isColoredBadge = ['bkash', 'bkash_gateway', 'nagad', 'uddoktapay', 'sslcommerz'].includes(type);

  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getBgClass()} ${isColoredBadge ? 'text-white' : 'text-muted-foreground'} ${className}`}
    >
      {brand.label}
    </span>
  );
}
