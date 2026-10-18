import { Routes, Route } from 'react-router-dom'
import Catalogo from './Catalogo'
import Admin from './Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Catalogo />} />
    </Routes>
  )
}