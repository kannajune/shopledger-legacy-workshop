const test = require('node:test');
const assert = require('node:assert/strict');

const inventory = require('../lib/inventory');

test('allows selling exactly the remaining sellable stock', () => {
  const products = [
    { id: 1, name: 'A2 Gir Cow Ghee', stock: 1, reserved: 0 },
    { id: 2, name: 'Byadgi Chilli Powder', stock: 4, reserved: 3 }
  ];

  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), { ok: true });
  assert.deepEqual(inventory.check(products, [{ id: 2, qty: 1 }]), { ok: true });
});

test('rejects quantities greater than remaining sellable stock', () => {
  const products = [{ id: 1, name: 'Ghee', stock: 4, reserved: 3 }];

  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 2 }]), {
    ok: false,
    msg: 'Ghee is out of stock (1 sellable available)'
  });
});

test('releases cancelled order quantities back into physical stock', () => {
  const products = [
    { id: 6, stock: 1, reserved: 0 },
    { id: 4, stock: 22, reserved: 4 }
  ];
  const items = [{ id: 6, qty: 2 }, { id: 4, qty: 2 }];

  inventory.release(products, items);

  assert.equal(products[0].stock, 3);
  assert.equal(products[1].stock, 24);
  assert.equal(products[0].reserved, 0);
  assert.equal(products[1].reserved, 4);
});
