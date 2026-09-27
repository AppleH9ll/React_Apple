import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { CartProvider } from "./CartContext";
import Menu from "./Menu";

import Home from "./Home";
import About from "./About";
import Product from "./Product";
import Cart from "./Cart";
import Login from "./Login";
import Dashboard from "./Dashboard";

function AppContent() {
  const { theme } = useTheme();

  const appStyles = {
    backgroundColor: theme === "dark" ? "#121212" : "#ffffff",
    color: theme === "dark" ? "#f5f5f5" : "#000000",
    minHeight: "100vh",
    width: "100%",
    padding: "20px",
    transition: "background-color 0.3s, color 0.3s",
  };

  return (
    <div style={appStyles}>
      <Menu />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<h1>404 — Страница не найдена</h1>} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  );
}