// تكوين Firebase
const firebaseConfig = {
  databaseURL: "https://coffee-dda5d-default-rtdb.firebaseio.com/"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// متغيرات النظام
let currentTable = null;
const orderItems = {}; // لتخزين الكميات المحددة

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // تعيين السنة الحالية في التذييل
  document.getElementById('year').textContent = new Date().getFullYear();
  
  // تحميل القائمة عند فتح الصفحة (سيتم إخفاؤها حتى إدخال رقم الطاولة)
  loadMenu();
});

// الدخول بإدخال رقم الطاولة
function enterTable() {
  const table = document.getElementById('tableNumber').value;
  if (table) {
    currentTable = table;
    document.getElementById('table-input').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
  } else {
    alert("الرجاء إدخال رقم الطاولة");
  }
}

// تحميل قائمة الطعام
function loadMenu() {
  db.ref("menu").on("value", snapshot => {
    const itemsDiv = document.getElementById('menu-items');
    itemsDiv.innerHTML = '';
    const items = snapshot.val();
    
    if (!items || Object.keys(items).length === 0) {
      itemsDiv.innerHTML = `
        <div class="empty-menu">
          <i class="fas fa-utensils"></i>
          <p>لا توجد أصناف متاحة حالياً</p>
        </div>
      `;
      return;
    }
    
    for (let key in items) {
      const item = items[key];
      // تهيئة الكمية لكل صنف بـ 0
      orderItems[key] = 0;
      
      itemsDiv.innerHTML += `
        <div class="menu-item" id="item-${key}">
          <div class="item-info">
            <h3>${item.name}</h3>
            <div class="item-price">${item.price} جنيه</div>
          </div>
          <div class="item-controls">
            <div class="quantity-selector">
              <button onclick="updateQuantity('${key}', -1)" class="qty-btn minus">
                <i class="fas fa-minus"></i>
              </button>
              <span id="qty-${key}" class="qty-value">0</span>
              <button onclick="updateQuantity('${key}', 1)" class="qty-btn plus">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <textarea id="note-${key}" placeholder="ملاحظات خاصة" class="item-notes"></textarea>
          </div>
        </div>
      `;
    }
  });
}

// تحديث كمية الصنف
function updateQuantity(itemId, change) {
  let newQty = orderItems[itemId] + change;
  
  // التأكد من أن الكمية لا تكون أقل من الصفر
  if (newQty < 0) newQty = 0;
  
  orderItems[itemId] = newQty;
  document.getElementById(`qty-${itemId}`).textContent = newQty;
  
  // تغيير لون العنصر إذا كانت الكمية > 0
  const itemElement = document.getElementById(`item-${itemId}`);
  if (newQty > 0) {
    itemElement.classList.add('selected');
  } else {
    itemElement.classList.remove('selected');
  }
}

// إرسال الطلب
function submitOrder() {
  if (!currentTable) {
    alert("الرجاء إدخال رقم الطاولة أولاً");
    return;
  }
  
  const order = { 
    table: currentTable, 
    items: [],
    status: "pending",
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  let hasItems = false;
  
  db.ref("menu").once("value").then(snapshot => {
    const items = snapshot.val();
    
    for (let key in items) {
      const qty = orderItems[key];
      const note = document.getElementById(`note-${key}`).value;
      
      if (qty > 0) {
        hasItems = true;
        order.items.push({
          name: items[key].name,
          price: items[key].price,
          qty: qty,
          note: note || "لا توجد ملاحظات"
        });
      }
    }
    
    if (!hasItems) {
      alert("الرجاء إضافة كمية لعنصر واحد على الأقل");
      return;
    }
    
    // إرسال الطلب إلى قاعدة البيانات
    db.ref("orders").push(order)
      .then(() => {
        showOrderSummary(order);
        resetOrderForm();
      })
      .catch(error => {
        alert("حدث خطأ أثناء إرسال الطلب: " + error.message);
      });
  });
}

// عرض ملخص الطلب
function showOrderSummary(order) {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('summary-table').textContent = order.table;
  
  const itemsDiv = document.getElementById('summary-items');
  itemsDiv.innerHTML = '<strong>تفاصيل الطلب:</strong><br><br>';
  
  let total = 0;
  order.items.forEach(item => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    itemsDiv.innerHTML += `
      <div class="summary-item">
        ${item.qty} × ${item.name} - ${itemTotal.toFixed(2)} جنيه
        ${item.note !== "لا توجد ملاحظات" ? `<div class="summary-note">ملاحظات: ${item.note}</div>` : ''}
      </div>
    `;
  });
  
  itemsDiv.innerHTML += `<br><div class="summary-total">المجموع: ${total.toFixed(2)} جنيه</div>`;
  
  document.getElementById('order-summary').style.display = 'block';
}

// إعادة تعيين نموذج الطلب
function resetOrderForm() {
  for (let key in orderItems) {
    orderItems[key] = 0;
    document.getElementById(`qty-${key}`).textContent = '0';
    document.getElementById(`note-${key}`).value = '';
    document.getElementById(`item-${key}`).classList.remove('selected');
  }
}

// العودة إلى إدخال رقم الطاولة
function goBack() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('table-input').style.display = 'block';
  document.getElementById('tableNumber').value = '';
  currentTable = null;
  resetOrderForm();
}

// بدء طلب جديد
function newOrder() {
  document.getElementById('order-summary').style.display = 'none';
  document.getElementById('table-input').style.display = 'block';
  document.getElementById('tableNumber').value = '';
  currentTable = null;
  resetOrderForm();
}
