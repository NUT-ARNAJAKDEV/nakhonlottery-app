import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ErrorBoundary from './ErrorBoundary.jsx';
import Page_Main from './Page_Main';
import Page_Admin from './Page_Admin';
import Page_Users from './Page_Users';

const App = () => {
  return (
    <Router>
      <ErrorBoundary fallback={<div>เกิดข้อผิดพลาด กรุณาลองใหม่</div>}>
        <Routes>
          <Route path="/" element={<Page_Main />} />
          <Route path="/admin" element={<Page_Admin />} />
          <Route path="/users" element={<Page_Users />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
};

export default App;