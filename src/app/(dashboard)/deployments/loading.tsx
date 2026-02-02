import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Loading() {
  return (
    <LoadingSpinner 
      fullScreen 
      size="xl" 
      text="Loading deployments..."
    />
  );
}
