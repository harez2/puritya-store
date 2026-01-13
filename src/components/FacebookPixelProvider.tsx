import { useFacebookPixel } from '@/hooks/useFacebookPixel';

export function FacebookPixelProvider({ children }: { children: React.ReactNode }) {
  useFacebookPixel();
  return <>{children}</>;
}
