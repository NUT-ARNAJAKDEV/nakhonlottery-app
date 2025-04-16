// 1. สร้าง ErrorBoundary.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const withErrorBoundary = (Component, fallback) => (props) => {
  const navigate = useNavigate();
  
  const handleError = () => {
    navigate("/");
  };

  return (
    <ErrorBoundary fallback={fallback || <div>เกิดข้อผิดพลาด กรุณาลองใหม่</div>}>
      <Component {...props} onError={handleError} />
    </ErrorBoundary>
  );
};

export default ErrorBoundary;