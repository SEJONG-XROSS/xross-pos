const products = [
  { id: 1, name: "아메리카노", price: 3500, risk: 1 },
  { id: 2, name: "카페라떼", price: 4200, risk: 1 },
  { id: 3, name: "카푸치노", price: 4500, risk: 1 },
  { id: 4, name: "치즈케이크", price: 5200, risk: 1 },
  { id: 5, name: "샌드위치", price: 6800, risk: 2 },
  { id: 6, name: "콜드브루", price: 4900, risk: 1 },
  { id: 7, name: "제로콜라", price: 2500, risk: 1 },
  { id: 8, name: "에이드", price: 5500, risk: 2 },
  { id: 9, name: "샐러드", price: 7200, risk: 2 }
];

const cart = new Map();

const dateTimeEl = document.getElementById("date-time");
const productsEl = document.getElementById("products");
const cartItemsEl = document.getElementById("cart-items");
const subtotalEl = document.getElementById("subtotal");
const vatEl = document.getElementById("vat");
const totalEl = document.getElementById("total");
const searchEl = document.getElementById("search");
const clearBtn = document.getElementById("clear-btn");
const payBtn = document.getElementById("pay-btn");
const riskAlertEl = document.getElementById("risk-alert");
const riskLogEl = document.getElementById("risk-log");

function formatWon(value) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function updateDateTime() {
  const now = new Date();
  dateTimeEl.textContent = now.toLocaleString("ko-KR", { hour12: false });
}

function renderProducts(list) {
  productsEl.innerHTML = "";
  list.forEach((item) => {
    const card = document.createElement("button");
    card.className = "product";
    card.innerHTML = `<div class="name">${item.name}</div><div class="price">${formatWon(item.price)}</div>`;
    card.addEventListener("click", () => addToCart(item));
    productsEl.appendChild(card);
  });
}

function addToCart(item) {
  const current = cart.get(item.id);
  if (current) {
    current.qty += 1;
  } else {
    cart.set(item.id, { ...item, qty: 1 });
  }
  evaluateRisk();
  renderCart();
}

function changeQty(id, diff) {
  const target = cart.get(id);
  if (!target) return;
  target.qty += diff;
  if (target.qty <= 0) {
    cart.delete(id);
  }
  evaluateRisk();
  renderCart();
}

function renderCart() {
  cartItemsEl.innerHTML = "";

  if (cart.size === 0) {
    cartItemsEl.innerHTML = '<p class="muted">선택된 상품이 없습니다.</p>';
  } else {
    [...cart.values()].forEach((row) => {
      const line = document.createElement("div");
      line.className = "cart-row";
      line.innerHTML = `
        <div>${row.name}</div>
        <div class="qty-controls">
          <button class="icon-btn minus">-</button>
          <strong>${row.qty}</strong>
          <button class="icon-btn plus">+</button>
        </div>
        <div>${formatWon(row.price)}</div>
        <strong>${formatWon(row.price * row.qty)}</strong>
      `;
      line.querySelector(".minus").addEventListener("click", () => changeQty(row.id, -1));
      line.querySelector(".plus").addEventListener("click", () => changeQty(row.id, 1));
      cartItemsEl.appendChild(line);
    });
  }

  const subtotal = [...cart.values()].reduce((sum, row) => sum + row.price * row.qty, 0);
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;
  subtotalEl.textContent = formatWon(subtotal);
  vatEl.textContent = formatWon(vat);
  totalEl.textContent = formatWon(total);
}

function appendRiskLog(text) {
  const item = document.createElement("li");
  item.textContent = `[${new Date().toLocaleTimeString("ko-KR", { hour12: false })}] ${text}`;
  riskLogEl.prepend(item);
}

function evaluateRisk() {
  const rows = [...cart.values()];
  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
  const totalPrice = rows.reduce((sum, row) => sum + row.price * row.qty, 0);
  const highRiskCount = rows.filter((row) => row.risk === 2).length;

  riskAlertEl.classList.remove("risk-warning", "risk-danger");
  const body = riskAlertEl.querySelector(".alert-body");

  if (totalQty >= 12 || totalPrice >= 100000) {
    riskAlertEl.classList.add("risk-danger");
    body.textContent = "위험: 비정상적으로 큰 주문 패턴이 감지되었습니다. 관리자 확인이 필요합니다.";
    appendRiskLog("위험 경보 - 고액/대량 주문 패턴 감지");
  } else if (highRiskCount >= 2 && totalQty >= 6) {
    riskAlertEl.classList.add("risk-warning");
    body.textContent = "주의: 이상행동 가능성이 있는 주문 조합입니다. 결제 전 재확인을 권장합니다.";
    appendRiskLog("주의 경보 - 의심 조합 주문 감지");
  } else {
    body.textContent = "현재 정상 상태입니다. 의심 이벤트가 감지되면 이 영역에 즉시 표시됩니다.";
  }
}

searchEl.addEventListener("input", (e) => {
  const keyword = e.target.value.trim();
  const filtered = products.filter((item) => item.name.includes(keyword));
  renderProducts(filtered);
});

clearBtn.addEventListener("click", () => {
  cart.clear();
  evaluateRisk();
  renderCart();
  appendRiskLog("주문 전체 취소");
});

payBtn.addEventListener("click", () => {
  const total = [...cart.values()].reduce((sum, row) => sum + row.price * row.qty, 0);
  if (total <= 0) {
    window.alert("결제할 항목이 없습니다.");
    return;
  }
  appendRiskLog("결제 승인 요청");
  window.alert("결제 프로세스를 시작합니다.");
});

updateDateTime();
setInterval(updateDateTime, 1000);
renderProducts(products);
renderCart();
