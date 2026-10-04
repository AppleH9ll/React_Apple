import { createContext, useContext, useEffect, useReducer } from "react";

const CartContext = createContext();

const getInitialState = () => {
  try {
    const saved = localStorage.getItem("cart");
    return { items: saved ? JSON.parse(saved) : [] };
  } catch {
    return { items: [] };
  }
};

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.payload.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }

    case "INCREASE":
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.payload ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };

    case "DECREASE":
      return {
        ...state,
        items: state.items
          .map((i) =>
            i.id === action.payload ? { ...i, quantity: i.quantity - 1 } : i
          )
          .filter((i) => i.quantity > 0),
      };

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.payload),
      };

    case "CLEAR_CART":
      return { ...state, items: [] };

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, getInitialState);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(state.items));
  }, [state.items]);

  const addToCart = (product) => dispatch({ type: "ADD_ITEM", payload: product });
  const increase = (id) => dispatch({ type: "INCREASE", payload: id });
  const decrease = (id) => dispatch({ type: "DECREASE", payload: id });
  const removeFromCart = (id) => dispatch({ type: "REMOVE_ITEM", payload: id });
  const clearCart = () => dispatch({ type: "CLEAR_CART" });

  const total = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const count = state.items.reduce((sum, item) => sum + item.quantity, 0);

  const getQuantity = (id) =>
    state.items.find((i) => i.id === id)?.quantity || 0;

  return (
    <CartContext.Provider
      value={{
        cart: state.items,
        addToCart,
        increase,
        decrease,
        removeFromCart,
        clearCart,
        total,
        count,
        getQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}