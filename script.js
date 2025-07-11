const firebaseConfig = {
  databaseURL: "https://coffee-dda5d-default-rtdb.firebaseio.com/"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// متغيرات التطبيق
let currentTable = null;
let currentOrder = {
  items: [],
  timestamp: null
};

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
  // تعيين السنة في التذييل
  document.getElementById('year').textContent = new Date().getFullYear();
  
  // عرض شاشة إدخال رقم الطاولة أولاً
  showScreen('table-input');
});

// عرض شاشة معينة وإخفاء الأخرى
function showScreen(screenId) {
  // إخفاء جميع الشاشات
  document.getElementById('table-input').classList.remove('active');
  document.getElementById('menu').classList.remove('active');
  document.getElementById('order-summary').classList.remove('active');
  
  // عرض الشاشة المطلوبة
  document.getElementById(screenId).classList.add('active');
}

// عند إدخال رقم الطاولة
function enterTable() {
  const tableNumber = document.getElementById('tableNumber').value.trim();
  
  if (!tableNumber) {
    alert("الرجاء إدخال رقم الطاولة");
    return;
  }
  
  if (isNaN(tableNumber) || parseInt(tableNumber) <= 0) {
    alert("رقم الطاولة يجب أن يكون رقماً موجباً");
    return;
  }
  
  currentTable = tableNumber;
  document.getElementById('current-table').textContent = tableNumber;
  showScreen('menu');
  loadMenu();
}

// تحميل قائمة الطعام من Firebase
function loadMenu() {
  db.ref("menu").on("value", function(snapshot) {
    const menuItemsContainer = document.getElementById('menu-items');
    menuItemsContainer.innerHTML = '';
    
    const menuItems = snapshot.val();
    
    if (!menuItems || Object.keys(menuItems).length === 0) {
      menuItemsContainer.innerHTML = `
        <div class="empty-menu">
          <i class="fas fa-utensils"></i>
          <p>لا توجد أصناف متاحة حالياً</p>
        </div>
      `;
      return;
    }
    
    // إعادة تعيين الطلب الحالي
    currentOrder.items = [];
    
    for (const [itemId, item] of Object.entries(menuItems)) {
      const menuItemElement = createMenuItemElement(itemId, item);
      menuItemsContainer.appendChild(menuItemElement);
    }
  });
}

// إنشاء عنصر قائمة طعام
function createMenuItemElement(itemId, item) {
  const itemElement = document.createElement('div');
  itemElement.className = 'menu-item';
  
  itemElement.innerHTML = `
    <div class="item-info">
      <h3>${item.name}</h3>
      <div class="item-price">${item.price} جنيه</div>
    </div>
    <div class="item-controls">
      <div class="quantity-selector">
        <button onclick="changeQuantity('${itemId}', -1)" class="qty-btn minus">
          <i class="fas fa-minus"></i>
        </button>
        <span id="qty-${itemId}" class="qty-value">0</span>
        <button onclick="changeQuantity('${itemId}', 1)" class="qty-btn plus">
          <i class="fas fa-plus"></i>
        </button>
      </div>
      <textarea id="note-${itemId}" placeholder="ملاحظات خاصة (اختياري)"></textarea>
    </div>
  `;
  
  return itemElement;
}

// تغيير كمية الصنف
function changeQuantity(itemId, change) {
  const quantityElement = document.getElementById(`qty-${itemId}`);
  let currentQuantity = parseInt(quantityElement.textContent) || 0;
  
  const newQuantity = currentQuantity + change;
  if (newQuantity >= 0) {
    quantityElement.textContent = newQuantity;
    updateCurrentOrder(itemId, newQuantity);
  }
}

// تحديث الطلب الحالي
function updateCurrentOrder(itemId, quantity) {
  // إزالة الصنف إذا كانت الكمية صفر
  if (quantity === 0) {
    currentOrder.items = currentOrder.items.filter(item => item.id !== itemId);
    return;
  }
  
  // البحث عن الصنف في القائمة
  db.ref(`menu/${itemId}`).once('value').then(snapshot => {
    const menuItem = snapshot.val();
    
    if (!menuItem) return;
    
    // البحث عن الصنف في الطلب الحالي
    const existingItemIndex = currentOrder.items.findIndex(item => item.id === itemId);
    
    if (existingItemIndex >= 0) {
      // تحديث الصنف الموجود
      currentOrder.items[existingItemIndex].qty = quantity;
      currentOrder.items[existingItemIndex].note = document.getElementById(`note-${itemId}`).value;
    } else {
      // إضافة صنف جديد
      currentOrder.items.push({
        id: itemId,
        name: menuItem.name,
        price: parseFloat(menuItem.price),
        qty: quantity,
        note: document.getElementById(`note-${itemId}`).value
      });
    }
  });
}

// تأكيد الطلب وإرساله
function submitOrder() {
  if (!currentTable) {
    alert("حدث خطأ! الرجاء إدخال رقم الطاولة مرة أخرى");
    showScreen('table-input');
    return;
  }
  
  if (currentOrder.items.length === 0) {
    alert("الرجاء إضافة عنصر واحد على الأقل إلى الطلب");
    return;
  }
  
  // إعداد بيانات الطلب
  const orderData = {
    table: currentTable,
    items: currentOrder.items,
    status: "pending",
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  // إرسال الطلب إلى Firebase
  db.ref("orders").push(orderData)
    .then(() => {
      // عرض ملخص الطلب
      showOrderSummary(orderData);
    })
    .catch(error => {
      alert("حدث خطأ أثناء إرسال الطلب: " + error.message);
    });
}

// عرض ملخص الطلب
function showOrderSummary(order) {
  // تعيين بيانات الطاولة والوقت
  document.getElementById('summary-table').textContent = order.table;
  document.getElementById('order-time').textContent = new Date().toLocaleString('ar-EG');
  
  // عرض العناصر المطلوبة
  const summaryItemsContainer = document.getElementById('summary-items');
  summaryItemsContainer.innerHTML = '';
  
  let total = 0;
  
  order.items.forEach(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    
    const itemElement = document.createElement('div');
    itemElement.className = 'summary-item';
    itemElement.innerHTML = `
      <div class="item-name-qty">
        <span class="item-name">${item.name}</span>
        <span class="item-qty">${item.qty} × ${item.price} ج</span>
      </div>
      <div class="item-total">${itemTotal.toFixed(2)} ج</div>
      ${item.note ? `<div class="item-note">ملاحظات: ${item.note}</div>` : ''}
    `;
    
    summaryItemsContainer.appendChild(itemElement);
  });
  
  // تعيين المجموع الكلي
  document.getElementById('total-price').textContent = total.toFixed(2);
  
  // عرض شاشة الملخص
  showScreen('order-summary');
}

// العودة إلى إدخال رقم الطاولة
function goBack() {
  showScreen('table-input');
}

// بدء طلب جديد
function newOrder() {
  // إعادة تعيين القيم
  currentTable = null;
  currentOrder.items = [];
  document.getElementById('tableNumber').value = '';
  
  // إعادة عرض شاشة إدخال رقم الطاولة
  showScreen('table-input');
}
