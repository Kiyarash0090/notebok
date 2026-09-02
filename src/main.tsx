import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { DocumentViewerProvider } from './context/DocumentViewerContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DocumentViewerProvider>
        <App />
      </DocumentViewerProvider>
    </ErrorBoundary>
  </StrictMode>,
);

