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
      itemsDiv.innerHTML += `
        <div class="menu-item">
          <div class="item-info">
            <h3>${item.name}</h3>
            <div class="item-price">${item.price} جنيه</div>
          </div>
          <div class="item-controls">
            <div class="quantity-selector">
              <button onclick="decrementQuantity('${key}')" class="qty-btn">
                <i class="fas fa-minus"></i>
              </button>
              <span id="qty-value-${key}" class="qty-value">0</span>
              <button onclick="incrementQuantity('${key}')" class="qty-btn">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <textarea id="note-${key}" placeholder="ملاحظات خاصة"></textarea>
          </div>
        </div>
      `;
    }
  });
}

// دالة زيادة الكمية
function incrementQuantity(itemId) {
  const qtyElement = document.getElementById(`qty-value-${itemId}`);
  let currentQty = parseInt(qtyElement.textContent) || 0;
  qtyElement.textContent = currentQty + 1;
}

// دالة تقليل الكمية
function decrementQuantity(itemId) {
  const qtyElement = document.getElementById(`qty-value-${itemId}`);
  let currentQty = parseInt(qtyElement.textContent) || 0;
  if (currentQty > 0) {
    qtyElement.textContent = currentQty - 1;
  }
}

// تعديل دالة submitOrder لقراءة الكميات الجديدة
function submitOrder() {
  const order = { 
    table: currentTable, 
    items: [],
    status: "pending",
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  db.ref("menu").once("value").then(snapshot => {
    const items = snapshot.val();
    let hasItems = false;
    
    for (let key in items) {
      const qty = parseInt(document.getElementById(`qty-value-${key}`).textContent) || 0;
      const note = document.getElementById(`note-${key}`).value;
      if (qty > 0) {
        hasItems = true;
        order.items.push({
          name: items[key].name,
          price: items[key].price,
          qty: qty,
          note: note
        });
      }
    }
    
    if (!hasItems) {
      alert("الرجاء إضافة كمية لعنصر واحد على الأقل");
      return;
    }
    
    db.ref("orders").push(order);
    showOrderSummary(order);
  });
}
