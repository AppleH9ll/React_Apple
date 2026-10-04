import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "./CartContext";

export default function Product() {
  const { id } = useParams();
  const { addToCart, getQuantity, increase, decrease } = useCart();
  const navigate = useNavigate();

  const product = {
    id: Number(id),
    name: `Товар ${id}`,
    price: 1000 * Number(id),
    image: `https://picsum.photos/seed/${id}/400/300`,
  };

  const qty = getQuantity(product.id);

  return (
    <div>
      <h1>{product.name}</h1>
      <img
        src={product.image}
        alt={product.name}
        style={{ width: "300px", borderRadius: "10px", display: "block", marginBottom: "10px" }}
      />
      <p>Цена: {product.price.toLocaleString()} ₽</p>

      {qty === 0 ? (
        <button onClick={() => addToCart(product)} style={{ padding: "8px 16px" }}>
          Добавить в корзину
        </button>
      ) : (
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => decrease(product.id)}>−</button>
          <span>{qty}</span>
          <button onClick={() => increase(product.id)}>+</button>
          <button onClick={() => navigate("/cart")}>Перейти в корзину</button>
        </div>
      )}
    </div>
  );
}