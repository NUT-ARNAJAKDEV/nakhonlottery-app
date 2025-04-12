import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Page_Main from './Page_Main'
import Page_Admin from './Page_Admin'
import Page_Users from './Page_Users'

const App = () => {
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Page_Main />} />
        <Route path="/admin" element={<Page_Admin />} />
        <Route path="/users" element={<Page_Users />} />
      </Routes>
    </Router>
  )
}

export default App
