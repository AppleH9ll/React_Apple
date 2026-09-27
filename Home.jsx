import { useNavigate } from "react-router-dom";
import { useCart } from "./CartContext";
import { useTheme } from "./ThemeContext";

const PRODUCTS = [
  {
    id: 1,
    name: "Алтайский воздух",
    price: 1490,
    image: "https://avatars.mds.yandex.net/i?id=be52adb6b815f935d9bc7c34fe95e6a1_l-5111908-images-thumbs&n=13",
  },
  {
    id: 2,
    name: "Воздух Санкт-Петербурга",
    price: 500,
    image: "https://avatars.mds.yandex.net/i?id=e2e0d217fb3631de9a40ad10f6b294df_l-8312047-images-thumbs&n=13",
  },
  {
    id: 3,
    name: "Воздух Байкала",
    price: 2500,
    image: "https://50.img.avito.st/image/1/1.KGqnTba5hIOx5T6J-wkfNQXugokTTo05Ge6GhxvkjoE.ppeg9sWNYe8iZMvJqGAr6onQEysCFjFB_thIfpD0IUg",
  },
  {
    id: 4,
    name: "Воздух России",
    price: 3500,
    image: "https://cont.ws/uploads/posts2/432027.jpg",
  },
  {
    id: 5,
    name: "Деревенский воздух",
    price: 350,
    image: "https://avatars.mds.yandex.net/i?id=0f9dcdf3886b3b59e7217109e2a40017_l-7765754-images-thumbs&n=13",
  },
];

export default function Home() {
  const { addToCart, getQuantity, increase, decrease } = useCart();
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <div>
      <h1>Каталог товаров</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "15px",
        }}
      >
        {PRODUCTS.map((p) => {
          const qty = getQuantity(p.id);
          return (
            <div
              key={p.id}
              style={{
                border: `1px solid ${theme === "dark" ? "#555" : "#ddd"}`,
                borderRadius: "10px",
                overflow: "hidden",
                background: theme === "dark" ? "#1e1e1e" : "#fafafa",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <img
                src={p.image}
                alt={p.name}
                style={{ width: "100%", height: "160px", objectFit: "cover" }}
              />

              <div style={{ padding: "12px", flexGrow: 1 }}>
                <h3 style={{ margin: "0 0 8px" }}>{p.name}</h3>
                <p style={{ margin: "0 0 12px", fontWeight: "bold" }}>
                  {p.price.toLocaleString()} ₽
                </p>

                {qty === 0 ? (
                  <button
                    onClick={() => addToCart(p)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      borderRadius: "6px",
                      border: "none",
                      background: "#ff5722",
                      color: "#fff",
                      width: "100%",
                    }}
                  >
                    В корзину
                  </button>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={() => decrease(p.id)}
                      style={{
                        width: "32px",
                        height: "32px",
                        cursor: "pointer",
                        borderRadius: "6px",
                        border: "none",
                        background: "#e53935",
                        color: "#fff",
                        fontSize: "18px",
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontWeight: "bold" }}>{qty}</span>
                    <button
                      onClick={() => increase(p.id)}
                      style={{
                        width: "32px",
                        height: "32px",
                        cursor: "pointer",
                        borderRadius: "6px",
                        border: "none",
                        background: "#43a047",
                        color: "#fff",
                        fontSize: "18px",
                      }}
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  onClick={() => navigate("/cart")}
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    padding: "6px",
                    cursor: "pointer",
                    border: `1px solid ${theme === "dark" ? "#555" : "#ccc"}`,
                    background: "transparent",
                    color: "inherit",
                    borderRadius: "6px",
                  }}
                >
                  Перейти в корзину
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}