const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');
const reports = require('../lib/reports');

function makeOrder(overrides = {}) {
  return {
    id: 42,
    date: '22/11/2026',
    customer: 'Test customer',
    paymentMode: 'cash',
    status: 'completed',
    coupon: '',
    items: [
      { id: 1, sku: 'RICE-1', name: 'Rice', hsn: '1006', price: 100, qty: 1 },
      { id: 2, sku: 'TEA-1', name: 'Tea', hsn: '0902', price: 100, qty: 1 }
    ],
    ...overrides
  };
}

test('invoice and checkout use the same HSN GST slabs', () => {
  const order = makeOrder();
  const checkout = pricing.computeTotals(order.items, order.coupon);
  const printedInvoice = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    checkout.lines.map(line => line.gstPercent),
    [5, 18]
  );
  assert.equal(checkout.tax, 23);
  assert.equal(checkout.total, 223);
  assert.deepEqual(printedInvoice.rows.map(line => line.gstPercent), [5, 18]);
  assert.equal(printedInvoice.tax, 23);
  assert.equal(printedInvoice.total, 223);
});

test('invoice GST and total match the amount billed at checkout', () => {
  const order = makeOrder();
  const checkout = pricing.computeTotals(order.items, order.coupon);
  const printedInvoice = invoice.computeInvoiceFigures(order);

  assert.equal(printedInvoice.tax, checkout.tax);
  assert.equal(printedInvoice.total, checkout.total);
  assert.deepEqual(
    printedInvoice.rows.map(line => line.gstPercent),
    checkout.lines.map(line => line.gstPercent)
  );
});

test('invoice uses checkout percentage coupon amount and cap', () => {
  const order = makeOrder({
    coupon: 'SAVE10',
    items: [{ id: 3, name: 'Tea', hsn: '0902', price: 2000, qty: 1 }]
  });
  const checkout = pricing.computeTotals(order.items, order.coupon);
  const printedInvoice = invoice.computeInvoiceFigures(order);

  assert.equal(checkout.discount, 150);
  assert.equal(checkout.tax, 333);
  assert.equal(checkout.total, 2183);
  assert.equal(printedInvoice.discount, checkout.discount);
  assert.equal(printedInvoice.tax, checkout.tax);
  assert.equal(printedInvoice.total, checkout.total);
});

test('invoice follows checkout minimum-order validation for flat coupons', () => {
  const order = makeOrder({
    coupon: 'FLAT50',
    items: [{ id: 4, name: 'Rice', hsn: '1006', price: 100, qty: 1 }]
  });
  const checkout = pricing.computeTotals(order.items, order.coupon);
  const printedInvoice = invoice.computeInvoiceFigures(order);

  assert.equal(checkout.discount, 0);
  assert.equal(checkout.total, 105);
  assert.equal(printedInvoice.discount, checkout.discount);
  assert.equal(printedInvoice.total, checkout.total);
});

test('render prints checkout total without mismatch warning when ledger matches', () => {
  const order = makeOrder({ total: 223 });
  const html = invoice.render(order);

  assert.match(html, /Invoice Total<\/td><td class="r">₹223\.00/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('reconciliation matches invoice figures against billed ledger totals', () => {
  const order = makeOrder({
    subtotal: 200,
    discount: 0,
    tax: 23,
    total: 223
  });
  const result = reports.getGstReconciliation({ orders: [order] });

  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.totalDelta, 0);
  assert.equal(result.rows[0].invoiceTax, 23);
  assert.equal(result.rows[0].invoiceTotal, 223);
  assert.equal(result.rows[0].matched, true);
});
