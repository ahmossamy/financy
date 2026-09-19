import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { checkSupabaseConnection } from '@/lib/services/supabase-connection';

import './index.css';

void checkSupabaseConnection().then(({ connected, error }) => {
  if (connected) {
    console.info('[Supabase] Client connection check passed.');
  } else {
    console.warn('[Supabase] Client connection check failed:', error);
  }
});

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
