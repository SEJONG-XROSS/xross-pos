import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://43.202.227.251:3000";

let paymentSeq = 1;

function buildPaymentId(now) {
  const d = now.toISOString().slice(0, 19).replace(/[-T:]/g, "");
  return `PAY-${d}${String(paymentSeq).padStart(3, "0")}`;
}

function formatWon(value) {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        onLogin(data);
      } else if (res.status === 401) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        setError("로그인 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setError(`네트워크 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">XROSS</div>
        <p className="login-desc">POS 단말기에 로그인하세요</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              autoFocus
            />
          </div>
          <div className="login-field">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              required
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button
            type="submit"
            className="btn primary login-submit"
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PaymentOverlay({ result, onClose }) {
  if (!result) return null;

  if (result.status === "processing") {
    return (
      <div className="pay-overlay">
        <div className="pay-modal">
          <div className="pay-spinner" />
          <p className="pay-processing-text">결제 처리 중...</p>
        </div>
      </div>
    );
  }

  if (result.status === "success") {
    return (
      <div className="pay-overlay">
        <div className="pay-modal">
          <div className="pay-icon pay-icon--success">✓</div>
          <h2 className="pay-title">결제 완료</h2>
          <p className="pay-amount">{result.amount.toLocaleString("ko-KR")}원</p>
          <p className="pay-sub">{result.paymentId}</p>
          <button className="btn primary pay-btn" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="pay-overlay">
        <div className="pay-modal">
          <div className="pay-icon pay-icon--error">✕</div>
          <h2 className="pay-title">결제 실패</h2>
          <p className="pay-error-msg">{result.message}</p>
          <button className="btn secondary pay-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem("pos_auth");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  const [cart, setCart] = useState([]);
  const [paymentResult, setPaymentResult] = useState(null);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price ?? 0) * item.qty, 0),
    [cart],
  );
  const total = subtotal;

  const handleLogin = (data) => {
    const next = { user: data.user, token: data.accessToken };
    localStorage.setItem("pos_auth", JSON.stringify(next));
    setAuth(next);
  };

  const handleLogout = () => {
    localStorage.removeItem("pos_auth");
    setAuth(null);
    setProducts([]);
    setCart([]);
  };

  useEffect(() => {
    if (!auth) return;
    setProductsLoading(true);
    fetch(`${API_BASE}/products?storeId=${auth.user.storeId}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProducts(data.filter((p) => p.isActive !== false)))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [auth]);

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id);
      if (!found) return [...prev, { ...product, qty: 1 }];
      return prev.map((item) =>
        item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
      );
    });
  };

  const changeQty = (id, diff) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + diff } : item))
        .filter((item) => item.qty > 0),
    );
  };

  const clearCart = () => setCart([]);

  const requestPayment = async () => {
    if (subtotal <= 0) {
      window.alert("결제할 항목이 없습니다.");
      return;
    }

    const now = new Date();
    const externalPaymentId = buildPaymentId(now);
    paymentSeq += 1;

    const payload = {
      type: "PAYMENT_COMPLETED",
      storeId: auth.user.storeId,
      externalPaymentId,
      items: cart.map((item) => ({
        sku: item.sku,
        quantity: item.qty,
        unitPrice: Number(item.price ?? 0),
        subtotal: Number(item.price ?? 0) * item.qty,
      })),
      totalAmount: total,
      paidAt: now.toISOString(),
    };

    setPaymentResult({ status: "processing" });

    try {
      const res = await fetch(`${API_BASE}/event-details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCart([]);
        setPaymentResult({ status: "success", amount: total, paymentId: externalPaymentId });
      } else {
        const text = await res.text();
        setPaymentResult({ status: "error", message: `오류 ${res.status}: ${text}` });
      }
    } catch (err) {
      setPaymentResult({ status: "error", message: `네트워크 오류: ${err.message}` });
    }
  };

  return (
    <div className="app">
      <PaymentOverlay result={paymentResult} onClose={() => setPaymentResult(null)} />

      <header className="topbar">
        <div>
          <h1>XROSS POS</h1>
          <p className="muted">{dateTime.toLocaleString("ko-KR", { hour12: false })}</p>
        </div>
        <div className="store-info">
          <span>매장: {auth.user.storeName}</span>
          {auth.user.name && <span>직원: {auth.user.name}</span>}
          <button className="btn-logout" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="products-panel">
          <div className="panel-header">
            <h2>상품 선택</h2>
          </div>
          <div className="products-grid">
            {productsLoading ? (
              <p className="muted" style={{ padding: "12px" }}>상품 불러오는 중...</p>
            ) : products.length === 0 ? (
              <p className="muted" style={{ padding: "12px" }}>등록된 상품이 없습니다.</p>
            ) : (
              products.map((item) => (
                <button
                  key={item.id}
                  className="product"
                  onClick={() => addToCart(item)}
                >
                  <div className="name">{item.name}</div>
                  <div className="price">{formatWon(item.price)}</div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="cart-panel">
          <div className="panel-header">
            <h2>주문 내역</h2>
          </div>
          <div className="cart-items">
            {cart.length === 0 ? (
              <p className="muted">선택된 상품이 없습니다.</p>
            ) : (
              cart.map((row) => (
                <div key={row.id} className="cart-row">
                  <div>{row.name}</div>
                  <div className="qty-controls">
                    <button className="icon-btn" onClick={() => changeQty(row.id, -1)}>-</button>
                    <strong>{row.qty}</strong>
                    <button className="icon-btn" onClick={() => changeQty(row.id, 1)}>+</button>
                  </div>
                  <div>{formatWon(row.price)}</div>
                  <strong>{formatWon(Number(row.price ?? 0) * row.qty)}</strong>
                </div>
              ))
            )}
          </div>
          <div className="cart-summary">
            <div>
              <span>소계</span>
              <strong>{formatWon(subtotal)}</strong>
            </div>
            <div>
              <span>총 결제금액</span>
              <strong>{formatWon(total)}</strong>
            </div>
          </div>
          <div className="actions">
            <button className="btn secondary" onClick={clearCart}>
              전체 취소
            </button>
            <button className="btn primary" onClick={requestPayment}>
              결제 진행
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
