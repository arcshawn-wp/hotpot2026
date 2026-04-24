import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { TRPCProvider } from '@/providers/trpc'
import { DateProvider } from '@/contexts/DateContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <TRPCProvider>
      <DateProvider>
        <App />
      </DateProvider>
    </TRPCProvider>
  </HashRouter>,
)
