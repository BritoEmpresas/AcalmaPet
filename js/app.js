// ==========================================================
// JAVASCRIPT — COMPORTAMENTO DO SITE
// Aqui ficam eventos, funções, validações e interações.
// ==========================================================

// "price" é o preço CHEIO. Se "discount" for maior que 0, o preço
// cobrado é calculado por finalPrice() (preço cheio menos o desconto).
const allProducts = [
  { id:"1", name:"Ração Premium Cães Adultos 15kg", cat:"Ração",     price:149.90, icon:"🥣", image:"Produtos/ração dog.jpg", stock:22, discount:15 },
  { id:"2", name:"Ração Gatos Adultos 10kg",        cat:"Ração",     price:119.90, icon:"🥣", image:"Produtos/ração gato.jpg", stock:8,  discount:10 },
  { id:"3", name:"Petisco Natural para Cães 500g",  cat:"Petisco",   price:29.90,  icon:"🦴", image:"Produtos/petisco.jpg", stock:35, discount:20 },
  { id:"4", name:"Bola Interativa para Cachorros",  cat:"Brinquedo", price:39.90,  icon:"🎾", image:"Produtos/bolinha.jpg", stock:16, discount:0  },
  { id:"5", name:"Shampoo Neutro para Pets 500ml",  cat:"Higiene",   price:32.90,  icon:"🧴", image:"Produtos/shampoo.jpg", stock:13, discount:5  },
  { id:"6", name:"Coleira Ajustável Premium",       cat:"Acessório", price:45.90,  icon:"🐾", image:"Produtos/coleiras.jpg", stock:7,  discount:0  },
  { id:"7", name:"Areia Higiênica para Gatos 12kg", cat:"Higiene",   price:42.90,  icon:"🧼", image:"Produtos/areia.jpg", stock:28, discount:10 },
  { id:"8", name:"Brinquedo Mordedor Resistente",   cat:"Brinquedo", price:27.90,  icon:"🧸", image:"Produtos/pato.jpg", stock:19, discount:0  }
];

// Cupons aceitos: código => percentual de desconto (0.15 = 15%).
const COUPONS = { PET15: 0.15 };

const CART_KEY = "acalmapet_cart";
const COUPON_KEY = "acalmapet_coupon";
const LEGACY_CART_KEY = "pethouse_cart"; // nome antigo, lido só uma vez para migrar

// ----------------------------------------------------------
// ARMAZENAMENTO SEGURO
// Se o localStorage estiver bloqueado ou corrompido, o site
// continua funcionando (só não lembra o carrinho).
// ----------------------------------------------------------
function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignora */ }
}
function removeStorage(key) {
  try { localStorage.removeItem(key); } catch (e) { /* ignora */ }
}

// ----------------------------------------------------------
// PREÇOS
// ----------------------------------------------------------
function money(v) {
  return v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}
function findProduct(id) {
  return allProducts.find(p => p.id === String(id));
}
// Preço já com o desconto do produto (calculado em centavos para não errar arredondamento).
function finalPrice(p) {
  const cents = Math.round(p.price * 100);
  return Math.round(cents * (100 - (p.discount || 0)) / 100) / 100;
}
function hasCoupon(code) {
  return Object.prototype.hasOwnProperty.call(COUPONS, code);
}

// ----------------------------------------------------------
// ESTADO: carrinho e cupom
// O carrinho guarda SÓ {id, qty}. Nome e preço vêm sempre de
// allProducts, então ninguém consegue alterar preço pelo navegador.
// ----------------------------------------------------------
function loadCart() {
  let saved = readStorage(CART_KEY, null);
  if (saved === null) saved = readStorage(LEGACY_CART_KEY, []);
  if (!Array.isArray(saved)) return [];

  const clean = [];
  saved.forEach(item => {
    const p = findProduct(item && item.id);
    const qty = Math.floor(Number(item && item.qty));
    if (!p || !(qty > 0)) return;
    const existing = clean.find(x => x.id === p.id);
    if (existing) existing.qty = Math.min(existing.qty + qty, p.stock);
    else clean.push({ id:p.id, qty:Math.min(qty, p.stock) });
  });
  return clean.filter(x => x.qty > 0);
}

function loadCoupon() {
  const saved = readStorage(COUPON_KEY, null);
  return typeof saved === "string" && hasCoupon(saved) ? saved : null;
}

let cart = loadCart();
let appliedCoupon = loadCoupon();

function saveCart() {
  writeStorage(CART_KEY, cart);
  removeStorage(LEGACY_CART_KEY);
  updateCartCount();
}

// Linhas do carrinho já com produto e preço unitário reais.
function cartLines() {
  return cart
    .map(item => {
      const p = findProduct(item.id);
      return p ? { p, qty:item.qty, unit:finalPrice(p) } : null;
    })
    .filter(Boolean);
}

// Subtotal, desconto do cupom e total (tudo calculado em centavos).
function getTotals() {
  const subtotalC = cartLines().reduce((sum, l) => sum + Math.round(l.unit * 100) * l.qty, 0);
  const rate = appliedCoupon ? COUPONS[appliedCoupon] : 0;
  const discountC = Math.round(subtotalC * rate);
  return {
    subtotal: subtotalC / 100,
    discount: discountC / 100,
    total: (subtotalC - discountC) / 100
  };
}

// ----------------------------------------------------------
// VITRINE
// ----------------------------------------------------------
function productCard(p) {
  // Mostra a etiqueta e o preço antigo riscado somente quando há desconto.
  const priceHtml = p.discount
    ? `<span class="price-old">${money(p.price)}</span><span class="price-now">${money(finalPrice(p))}</span>`
    : `<span class="price-now">${money(p.price)}</span>`;

  return `<article class="product-card">
    ${p.discount ? `<span class="discount">${p.discount}% OFF</span>` : ""}
    <div class="product-img">${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : p.icon}</div>
    <div class="cat">${p.cat.toUpperCase()}</div>
    <h3>${p.name}</h3>
    <div class="price">${priceHtml}</div>
    <button class="add-btn" onclick="addToCart('${p.id}')">Adicionar ao carrinho</button>
  </article>`;
}
function renderProducts(list) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  if (!Array.isArray(list) || list.length === 0) {
    grid.innerHTML = `
      <div class="empty-products">
        <strong>Nenhum produto encontrado.</strong>
        <p>Tente outra busca ou categoria.</p>
      </div>`;
  } else {
    grid.innerHTML = list.map(productCard).join("");
  }

  const summary = document.getElementById("productSummary");
  if (summary) {
    const count = Array.isArray(list) ? list.length : 0;
    summary.textContent = `${count} produto${count === 1 ? "" : "s"} encontrado${count === 1 ? "" : "s"}`;
  }
}

// ----------------------------------------------------------
// CARRINHO
// ----------------------------------------------------------
function addToCart(id) {
  const p = findProduct(id);
  if (!p) return;
  if (p.stock <= 0) return toast("Produto sem estoque.");

  const item = cart.find(x => x.id === p.id);
  if (item) {
    if (item.qty >= p.stock) return toast(`Estoque máximo: ${p.stock} unidades.`);
    item.qty++;
  } else {
    cart.push({ id:p.id, qty:1 });
  }
  saveCart();
  toast("Produto adicionado ao carrinho!");
}

function changeQty(id, delta) {
  const p = findProduct(id);
  const item = cart.find(x => x.id === String(id));
  if (!p || !item) return;

  const next = item.qty + delta;
  if (next <= 0) return removeFromCart(id);
  if (next > p.stock) return toast(`Estoque máximo: ${p.stock} unidades.`);

  item.qty = next;
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== String(id));
  saveCart();
  renderCart();
}

function updateCartCount() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = cart.reduce((s, x) => s + x.qty, 0);
}

function renderCart() {
  const box = document.getElementById("cartItems");
  if (!box) return;

  const lines = cartLines();
  box.innerHTML = lines.length
    ? lines.map(({ p, qty, unit }) => `
      <div class="cart-line">
        <div class="cart-info">
          <span class="cart-name">${p.icon} ${p.name}</span>
          <small class="cart-unit">${money(unit)} cada${p.discount ? ` · ${p.discount}% OFF` : ""}</small>
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="changeQty('${p.id}', -1)" aria-label="Diminuir quantidade de ${p.name}">−</button>
            <span class="qty-value">${qty}</span>
            <button type="button" class="qty-btn" onclick="changeQty('${p.id}', 1)" aria-label="Aumentar quantidade de ${p.name}">+</button>
            <button type="button" class="remove-btn" onclick="removeFromCart('${p.id}')" aria-label="Remover ${p.name} do carrinho">Remover</button>
          </div>
        </div>
        <b>${money(Math.round(unit * 100) * qty / 100)}</b>
      </div>`).join("")
    : "<div class='empty'>Seu carrinho está vazio.</div>";

  document.getElementById("cartTotal").textContent = money(getTotals().subtotal);
}

function openCart() {
  renderCart();
  document.getElementById("cartModal").classList.remove("hidden");
}
function openLogin() {
  document.getElementById("loginModal").classList.remove("hidden");
}
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

// ----------------------------------------------------------
// CHECKOUT E CUPOM
// ----------------------------------------------------------
function checkout() {
  if (!cart.length) return toast("Adicione produtos ao carrinho.");

  // Fecha o carrinho e abre a etapa de finalização, onde o cupom pode ser aplicado.
  closeModal("cartModal");
  renderCheckout();
  document.getElementById("checkoutModal")?.classList.remove("hidden");
}

function renderCheckout() {
  const items = document.getElementById("checkoutItems");
  if (!items) return;

  items.innerHTML = cartLines().map(({ p, qty, unit }) => `
    <div class="checkout-line">
      <span>${p.icon} ${p.name} × ${qty}</span>
      <b>${money(Math.round(unit * 100) * qty / 100)}</b>
    </div>
  `).join("");

  refreshCouponUI();
  updateCheckoutTotals();
}

function updateCheckoutTotals() {
  const t = getTotals();
  document.getElementById("checkoutSubtotal").textContent = money(t.subtotal);
  document.getElementById("checkoutDiscount").textContent = t.discount > 0 ? `- ${money(t.discount)}` : money(0);
  document.getElementById("checkoutTotal").textContent = money(t.total);
}

// Deixa o campo, o botão e a mensagem de acordo com o cupom realmente aplicado.
function refreshCouponUI() {
  const input = document.getElementById("couponInput");
  const message = document.getElementById("couponMessage");
  const button = document.getElementById("applyCouponBtn");
  if (!input || !message || !button) return;

  if (appliedCoupon) {
    const pct = Math.round(COUPONS[appliedCoupon] * 100);
    input.value = appliedCoupon;
    input.disabled = true;
    button.textContent = "Remover cupom";
    message.textContent = `Cupom ${appliedCoupon} aplicado com sucesso! ${pct}% de desconto.`;
    message.className = "coupon-message success";
  } else {
    input.disabled = false;
    button.textContent = "Usar cupom";
    message.textContent = "Use PET15 para ganhar 15% OFF.";
    message.className = "coupon-message";
  }
}

function applyCoupon() {
  const input = document.getElementById("couponInput");
  const message = document.getElementById("couponMessage");

  // Com cupom ativo, o botão vira "Remover cupom".
  if (appliedCoupon) {
    appliedCoupon = null;
    removeStorage(COUPON_KEY);
    if (input) input.value = "";
    refreshCouponUI();
    updateCheckoutTotals();
    return;
  }

  const code = (input?.value || "").trim().toUpperCase();

  if (!code) {
    message.textContent = "Digite um cupom para continuar.";
    message.className = "coupon-message error";
    return;
  }
  if (!hasCoupon(code)) {
    message.textContent = "Cupom inválido ou não encontrado.";
    message.className = "coupon-message error";
    return;
  }

  appliedCoupon = code;
  writeStorage(COUPON_KEY, code);
  refreshCouponUI();
  updateCheckoutTotals();
}

function finishOrder() {
  if (!cart.length) return toast("Adicione produtos ao carrinho.");
  toast(`Pedido preparado no valor de ${money(getTotals().total)}.`);
}

// ----------------------------------------------------------
// BUSCA E FILTROS
// ----------------------------------------------------------
function searchProducts() {
  const input = document.getElementById("searchInput");
  const q = (input?.value || "").toLowerCase().trim();

  if (document.getElementById("productGrid")) {
    const list = allProducts.filter(p =>
      `${p.name} ${p.cat}`.toLowerCase().includes(q)
    );
    renderProducts(list);

    // Na página de produtos, mantém a URL sincronizada com a busca.
    if (document.querySelector(".product-grid-page")) {
      const url = new URL(window.location.href);
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      window.history.replaceState({}, "", url);
    }
  } else if (q) {
    location.href = `products.html?q=${encodeURIComponent(q)}`;
  }
}
function filterCategory(cat) {
  location.href = `products.html?cat=${encodeURIComponent(cat)}`;
}
function filterProductsPage(cat, btn) {
  document.querySelectorAll(".filter-chip").forEach(x => x.classList.remove("active"));
  btn?.classList.add("active");

  const params = new URLSearchParams(location.search);
  const q = (params.get("q") || "").toLowerCase().trim();
  let list = cat === "Todos" ? [...allProducts] : allProducts.filter(p => p.cat === cat);

  if (q) {
    list = list.filter(p => `${p.name} ${p.cat}`.toLowerCase().includes(q));
  }

  renderProducts(list);
}

// ----------------------------------------------------------
// EXTRAS
// ----------------------------------------------------------
function copyCoupon() {
  navigator.clipboard?.writeText("PET15");
  toast("Cupom PET15 copiado!");
}

function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    Object.assign(t.style, {
      position:"fixed", bottom:"25px", right:"25px", background:"#111", color:"#fff",
      padding:"14px 18px", borderRadius:"8px", zIndex:"99", fontSize:"12px", fontWeight:"700"
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(toast.timer); // evita que um aviso antigo esconda o novo
  toast.timer = setTimeout(() => { t.style.display = "none"; }, 2200);
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const grid = document.getElementById("productGrid");
  if (grid && document.querySelector(".product-grid-page")) {
    const cat = params.get("cat") || "Todos";
    const chip = [...document.querySelectorAll(".filter-chip")].find(x => x.dataset.cat === cat)
      || document.querySelector(".filter-chip[data-cat='Todos']");
    filterProductsPage(cat, chip);
    if (document.getElementById("searchInput")) document.getElementById("searchInput").value = params.get("q") || "";
  } else if (grid) {
    renderProducts(allProducts.slice(0, 4));
  }
  updateCartCount();
});