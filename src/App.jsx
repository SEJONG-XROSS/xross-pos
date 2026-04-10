import { useEffect, useMemo, useState } from "react";

const products = [
  { id: 1, name: "바닐라 콘", price: 3000, risk: 1 },
  { id: 2, name: "초코 콘", price: 3200, risk: 1 },
  { id: 3, name: "딸기 콘", price: 3200, risk: 1 },
  { id: 4, name: "민트초코 컵", price: 3800, risk: 1 },
  { id: 5, name: "쿠키앤크림 컵", price: 4000, risk: 1 },
  { id: 6, name: "초코 브라우니 선데", price: 5200, risk: 2 },
  { id: 7, name: "딸기 치즈케이크 선데", price: 5500, risk: 2 },
  { id: 8, name: "패밀리팩", price: 18000, risk: 2 },
  { id: 9, name: "와플볼 더블", price: 6200, risk: 2 },
  { id: 10, name: "설레임임", price: 6400, risk: 2 },
];

function formatWon(value) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function getRiskStatus(cartItems) {
  const totalQty = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );
  const highRiskCount = cartItems.filter((item) => item.risk === 2).length;

  if (totalQty >= 12 || totalPrice >= 100000) {
    return {
      level: "danger",
      message:
        "위험: 비정상적으로 큰 주문 패턴이 감지되었습니다. 관리자 확인이 필요합니다.",
      log: "위험 경보 - 고액/대량 주문 패턴 감지",
    };
  }

  if (highRiskCount >= 2 && totalQty >= 6) {
    return {
      level: "warning",
      message:
        "주의: 이상행동 가능성이 있는 주문 조합입니다. 결제 전 재확인을 권장합니다.",
      log: "주의 경보 - 의심 조합 주문 감지",
    };
  }

  return {
    level: "normal",
    message:
      "현재 정상 상태입니다. 의심 이벤트가 감지되면 이 영역에 즉시 표시됩니다.",
    log: null,
  };
}

export default function App() {
  const [dateTime, setDateTime] = useState(new Date());
  const [cart, setCart] = useState([]);
  const [riskLogs, setRiskLogs] = useState([]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  );
  const total = subtotal;
  const riskStatus = useMemo(() => getRiskStatus(cart), [cart]);

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!riskStatus.log) return;
    const timestamp = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    setRiskLogs((prev) => [`[${timestamp}] ${riskStatus.log}`, ...prev]);
  }, [riskStatus.log]);

  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((item) => item.id === product.id);
      if (!found) {
        return [...prev, { ...product, qty: 1 }];
      }
      return prev.map((item) =>
        item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
      );
    });
  };

  const changeQty = (id, diff) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty + diff } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const addLog = (text) => {
    const timestamp = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    setRiskLogs((prev) => [`[${timestamp}] ${text}`, ...prev]);
  };

  const clearCart = () => {
    setCart([]);
    addLog("주문 전체 취소");
  };

  const requestPayment = () => {
    if (subtotal <= 0) {
      window.alert("결제할 항목이 없습니다.");
      return;
    }
    addLog("결제 승인 요청");
    window.alert("결제 프로세스를 시작합니다.");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>X-IV 아이스크림 POS</h1>
          <p className="muted">
            {dateTime.toLocaleString("ko-KR", { hour12: false })}
          </p>
        </div>
        <div className="store-info">
          <span>매장: 스위트 아이스크림 세종점</span>
          <span>POS: #A-03</span>
          <span>직원: 홍길동</span>
        </div>
      </header>

      <section
        className={`alert-section ${riskStatus.level === "warning" ? "risk-warning" : ""} ${
          riskStatus.level === "danger" ? "risk-danger" : ""
        }`}
      >
        <div className="alert-title">이상행동 감지 알림</div>
        <div className="alert-body">{riskStatus.message}</div>
      </section>

      <main className="layout">
        <section className="products-panel">
          <div className="panel-header">
            <h2>상품 선택</h2>
          </div>
          <div className="products-grid">
            {products.map((item) => (
              <button
                key={item.id}
                className="product"
                onClick={() => addToCart(item)}
              >
                <div className="name">{item.name}</div>
                <div className="price">{formatWon(item.price)}</div>
              </button>
            ))}
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
                    <button
                      className="icon-btn"
                      onClick={() => changeQty(row.id, -1)}
                    >
                      -
                    </button>
                    <strong>{row.qty}</strong>
                    <button
                      className="icon-btn"
                      onClick={() => changeQty(row.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <div>{formatWon(row.price)}</div>
                  <strong>{formatWon(row.price * row.qty)}</strong>
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

      <section className="bottom-area single">
        <div className="status-panel">
          <h3>감지 로그</h3>
          <ul>
            {riskLogs.map((log, idx) => (
              <li key={`${log}-${idx}`}>{log}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
