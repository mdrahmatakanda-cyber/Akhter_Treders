/* ══════════════════════════════════════════════════════════════
   GLOBAL STATE
   ══════════════════════════════════════════════════════════════
   পুরো অ্যাপ জুড়ে ব্যবহৃত হওয়া গ্লোবাল ভ্যারিয়েবলগুলো এখানে রাখা হয়েছে।
   ══════════════════════════════════════════════════════════════ */

// ── STATE ──
let currentUser = null, currentUserProfile = null, shopSettings = {};
let lockTimer = null, allProducts = [], allSales = [], allPurchases = [];
let allCustomers = [], allExpenses = [], allStockData = [];
let currentCustomerId = null, reportPeriod = 'today', cashTabMode = 'today';
let saleCart = [], saleCustomer = null, purchaseCart = [];
let editingProductId = null, editingExpenseId = null;
const activeModals = {};
const LOCK_TIMEOUT = 30 * 60 * 1000;
