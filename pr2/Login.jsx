import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    const isAuth = true;
    if (isAuth) {
      navigate("/dashboard");
    } else {
      alert("Ошибка авторизации");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Страница входа</h2>
      <p>Нажмите кнопку, чтобы войти</p>
      <button
        onClick={handleLogin}
        style={{
          padding: "10px 20px",
          cursor: "pointer",
          borderRadius: "8px",
          border: "none",
          background: "#1976d2",
          color: "#fff",
        }}
      >
        Войти
      </button>
    </div>
  );
}