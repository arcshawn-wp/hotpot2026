import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import CalendarPage from './pages/CalendarPage'
import ForecastPage from './pages/ForecastPage'
import ProductsPage from './pages/ProductsPage'
import ScriptsPage from './pages/ScriptsPage'
import HotspotDetailPage from './pages/HotspotDetailPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/forecast" element={<ForecastPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/scripts" element={<ScriptsPage />} />
        <Route path="/hotspot/:id" element={<HotspotDetailPage />} />
      </Routes>
    </Layout>
  )
}
