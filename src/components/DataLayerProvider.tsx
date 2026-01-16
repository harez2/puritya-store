import { useDataLayerInit } from '@/hooks/useDataLayer';

export function DataLayerProvider({ children }: { children: React.ReactNode }) {
  useDataLayerInit();
  return <>{children}</>;
}
