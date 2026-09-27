import { NavLink } from "react-router-dom";
import { useTheme } from "./ThemeContext";
import { useCart } from "./CartContext";

export default function Menu() {
  const { theme, toggleTheme } = useTheme();
  const { count } = useCart();

  const linkStyle = ({ isActive }) => ({
    color: isActive ? "#ff5722" : theme === "dark" ? "#fff" : "#000",
    fontWeight: isActive ? "bold" : "normal",
    marginRight: "15px",
    textDecoration: "none",
    transition: "0.3s",
  });

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "5px",
        padding: "10px",
        marginBottom: "20px",
        borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #ddd",
      }}
    >
      <NavLink to="/" end style={linkStyle}>Главная</NavLink>
      <NavLink to="/about" style={linkStyle}>О нас</NavLink>
      <NavLink to="/cart" style={linkStyle}>Корзина ({count})</NavLink>
      <NavLink to="/login" style={linkStyle}>Войти</NavLink>

      <button
        onClick={toggleTheme}
        style={{
          marginLeft: "auto",
          padding: "6px 12px",
          cursor: "pointer",
          borderRadius: "6px",
          border: "none",
          background: theme === "dark" ? "#ffb300" : "#333",
          color: theme === "dark" ? "#000" : "#fff",
          transition: "0.3s",
        }}
      >
        {theme === "light" ? "Тёмная" : "Светлая"}
      </button>
    </nav>
  );
}