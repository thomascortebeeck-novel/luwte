import '@luwte/ui/fonts.css';
import '@luwte/ui/tokens.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { AccountProvider } from './providers/AccountProvider';
import { AuthProvider } from './providers/AuthProvider';
import { LocaleProvider } from './providers/LocaleProvider';
import { ThemeProvider } from './providers/ThemeProvider';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root');

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <AccountProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AccountProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>,
);
