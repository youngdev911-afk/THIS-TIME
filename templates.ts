import type { Template } from "./types";

export const STARTER_TEMPLATES: Template[] = [
  {
    id: "vibecart",
    name: "VibeCart E-Commerce",
    type: "website",
    description:
      "Modern storefront with shopping cart, filter tabs, modal checkout, and dark accents.",
    category: "E-Commerce",
    prompt: "Create a modern online store named VibeCart with product grid, search, cart drawer, and order checkout modal.",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VibeCart | Premium Tech Store</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body class="bg-slate-50 text-slate-800 antialiased min-h-screen">
  <header class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-md">V</div>
        <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">VibeCart</span>
      </div>
      <div class="flex-1 max-w-md mx-6">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="searchInput" placeholder="Search gadgets, audio, wear..." class="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-full border-none focus:ring-2 focus:ring-indigo-500 text-sm outline-none transition">
        </div>
      </div>
      <button id="cartBtn" class="relative p-2.5 rounded-full hover:bg-slate-100 text-slate-700 transition">
        <i class="fa-solid fa-bag-shopping text-xl"></i>
        <span id="cartCount" class="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">0</span>
      </button>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl mb-8">
      <span class="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 inline-block">Next-Gen Audio</span>
      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">Aura Pro Wireless Headphones</h1>
      <p class="text-slate-300 text-sm sm:text-base mb-6">Immersive active noise cancellation with 40-hour battery life and spatial audio driver system.</p>
      <button onclick="addToCart(1)" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl transition shadow-lg shadow-indigo-500/30">Add to Cart &bull; $299</button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="productsGrid"></div>
  </main>

  <div id="cartDrawer" class="fixed inset-0 z-50 pointer-events-none transition-opacity duration-300 opacity-0">
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onclick="toggleCart(false)"></div>
    <div class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl p-6 flex flex-col pointer-events-auto transition-transform duration-300 translate-x-full" id="cartContent">
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <h2 class="text-lg font-bold text-slate-900">Your Shopping Cart</h2>
        <button onclick="toggleCart(false)" class="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto py-4 space-y-4" id="cartItemsList">
        <p class="text-center text-slate-400 py-12">Your cart is empty.</p>
      </div>
      <div class="pt-4 border-t border-slate-200 space-y-3">
        <div class="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span id="subtotalAmount" class="font-semibold text-slate-900">$0.00</span>
        </div>
        <button onclick="checkout()" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30">Checkout Now</button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>`,
      "styles.css": `.product-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -10px rgba(79, 70, 229, 0.15); }`,
      "app.js": `const PRODUCTS = [
  { id: 1, name: 'Aura Pro Headphones', price: 299, cat: 'audio', img: '\uD83C\uDFA7', rating: 4.9 },
  { id: 2, name: 'Chronos Smartwatch X', price: 199, cat: 'wearables', img: '\u231A', rating: 4.7 },
  { id: 3, name: 'Pulse Earbuds Air', price: 129, cat: 'audio', img: '\uD83C\uDFB5', rating: 4.8 },
  { id: 4, name: 'MagCharge Power Bank 20k', price: 79, cat: 'accessories', img: '\uD83D\uDD0B', rating: 4.6 }
];
let cart = [];
function renderProducts(query = '') {
  const grid = document.getElementById('productsGrid');
  const filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  grid.innerHTML = filtered.map(p => \`
    <div class="product-card bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
      <div>
        <div class="h-36 bg-slate-100 rounded-xl flex items-center justify-center text-5xl mb-4">\${p.img}</div>
        <h3 class="font-bold text-slate-900 mb-1">\${p.name}</h3>
        <span class="text-xs text-slate-500">\u2B50 \${p.rating}</span>
      </div>
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <span class="text-lg font-extrabold text-slate-900">$\${p.price}</span>
        <button onclick="addToCart(\${p.id})" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 text-xs font-semibold rounded-lg transition">+ Add</button>
      </div>
    </div>
  \`).join('');
}
function addToCart(id) {
  const p = PRODUCTS.find(item => item.id === id);
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty++; else cart.push({ ...p, qty: 1 });
  updateCartUI();
  toggleCart(true);
}
function updateCartUI() {
  const list = document.getElementById('cartItemsList');
  const count = document.getElementById('cartCount');
  const sub = document.getElementById('subtotalAmount');
  const totalQty = cart.reduce((acc, i) => acc + i.qty, 0);
  const totalAmount = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
  count.textContent = totalQty;
  sub.textContent = \`$\${totalAmount.toFixed(2)}\`;
  if (cart.length === 0) {
    list.innerHTML = \`<p class="text-center text-slate-400 py-12">Your cart is empty.</p>\`;
    return;
  }
  list.innerHTML = cart.map(i => \`
    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
      <div>
        <h4 class="font-bold text-xs text-slate-900">\${i.name}</h4>
        <span class="text-xs text-slate-500">$\${i.price} \u00D7 \${i.qty}</span>
      </div>
      <button onclick="removeFromCart(\${i.id})" class="text-rose-500 text-xs font-semibold">Remove</button>
    </div>
  \`).join('');
}
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartUI();
}
function toggleCart(open) {
  const d = document.getElementById('cartDrawer');
  const c = document.getElementById('cartContent');
  if (open) {
    d.classList.remove('opacity-0', 'pointer-events-none');
    c.classList.remove('translate-x-full');
  } else {
    d.classList.add('opacity-0', 'pointer-events-none');
    c.classList.add('translate-x-full');
  }
}
function checkout() {
  if (cart.length === 0) return;
  alert('Order placed successfully!');
  cart = [];
  updateCartUI();
  toggleCart(false);
}
document.getElementById('cartBtn').addEventListener('click', () => toggleCart(true));
document.getElementById('searchInput').addEventListener('input', e => renderProducts(e.target.value));
renderProducts();`,
    },
  },
];

export function createBlankFiles(projectType: "website" | "mobile"): Record<string, string> {
  return {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New App</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-6">
  <div class="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
    <h1 class="text-2xl font-bold text-slate-800 mb-2">Your App is Ready</h1>
    <p class="text-slate-500 text-sm">Tell the AI in the chat what features or design you would like to build!</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
    "styles.css": `/* Custom styles */`,
    "app.js": `// Application scripts`,
  };
}
