import { useNavigate } from "react-router-dom";
import { useCart } from "./CartContext";
import { useTheme } from "./ThemeContext";

export default function Cart() {
  const { cart, increase, decrease, removeFromCart, total, clearCart } = useCart();
  const { theme } = useTheme();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div>
        <h1>Корзина</h1>
        <p>Корзина пуста </p>
        <button onClick={() => navigate("/")} style={{ padding: "8px 16px" }}>
          Перейти в каталог
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Корзина</h1>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {cart.map((item) => (
          <li
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              padding: "12px",
              marginBottom: "10px",
              border: `1px solid ${theme === "dark" ? "#555" : "#ddd"}`,
              borderRadius: "10px",
              background: theme === "dark" ? "#1e1e1e" : "#fafafa",
              flexWrap: "wrap",
            }}
          >
            <img
              src={item.image}
              alt={item.name}
              style={{
                width: "80px",
                height: "80px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />

            <div style={{ flexGrow: 1, minWidth: "150px" }}>
              <h3 style={{ margin: "0 0 5px" }}>{item.name}</h3>
              <p style={{ margin: 0 }}>
                {item.price.toLocaleString()} ₽ × {item.quantity} ={" "}
                <b>{(item.price * item.quantity).toLocaleString()} ₽</b>
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={() => decrease(item.id)}
                style={{
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  border: "none",
                  borderRadius: "6px",
                  background: "#e53935",
                  color: "#fff",
                  fontSize: "16px",
                }}
              >
                −
              </button>
              <span style={{ minWidth: "20px", textAlign: "center" }}>
                {item.quantity}
              </span>
              <button
                onClick={() => increase(item.id)}
                style={{
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  border: "none",
                  borderRadius: "6px",
                  background: "#43a047",
                  color: "#fff",
                  fontSize: "16px",
                }}
              >
                +
              </button>
            </div>

            <button
              onClick={() => removeFromCart(item.id)}
              style={{
                background: "#e53935",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>

      <h2>Итого: {total.toLocaleString()} ₽</h2>

      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <button onClick={clearCart} style={{ padding: "8px 16px" }}>
          Очистить корзину
        </button>
        <button onClick={() => navigate("/")} style={{ padding: "8px 16px" }}>
          Продолжить покупки
        </button>
      </div>
    </div>
  );
}