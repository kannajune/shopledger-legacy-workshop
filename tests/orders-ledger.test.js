const test = require('node:test');
const assert = require('node:assert/strict');

const orders = require('../lib/orders');
const ledger = require('../lib/ledger');

test('order history sorts DD/MM/YYYY dates newest first across months', () => {
  const db = { orders: [
    { id: 1001, date: '28/12/2021' },
    { id: 1004, date: '30/01/2022' },
    { id: 1008, date: '15/03/2022' }
  ] };

  assert.deepEqual(orders.list(db, {}).map(order => order.id), [1008, 1004, 1001]);
});

test('order history date range includes dates within inclusive calendar bounds', () => {
  const db = { orders: [
    { id: 1001, date: '28/12/2021' },
    { id: 1002, date: '05/01/2022' },
    { id: 1004, date: '30/01/2022' },
    { id: 1008, date: '15/03/2022' }
  ] };

  assert.deepEqual(
    orders.list(db, { from: '2021-12-28', to: '2022-01-30' }).map(order => order.id),
    [1004, 1002, 1001]
  );
});

test('settlement amounts supplied as strings update Khata balance numerically', () => {
  const db = {
    customers: [{
      id: 1,
      name: 'Meera Joshi',
      openingBalance: 450,
      totalBilled: 1982.01,
      totalSettled: 1200,
      creditLimit: 5000
    }],
    settlements: [],
    nextSettlementId: 501
  };

  const result = ledger.recordSettlement(db, 1, '500', 'upi', '');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
});
