const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('admin request page initializes pagination and uses database totals rather than current-page counts', async () => {
  const elements = new Map(); let initialize, mounted;
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value: ['status-filter','date-filter'].includes(id) ? 'all' : '', textContent: '', innerHTML: '', listeners: {},
      addEventListener(type, callback) { this.listeners[type] = callback; }, append() {}, classList: { add() {}, remove() {} } });
    return elements.get(id);
  }
  const context = { document: { getElementById: element, createElement: () => ({ value: '', textContent: '' }), addEventListener: (event, callback) => { initialize = callback; } },
    window: { addEventListener() {} }, Date,
    FRMS: { requireUser: async () => true, showError: error => { throw error; }, mountRequestPagination: async options => {
      mounted = options;
      options.onChange([{ id: 'request-1', requestNumber: 1, requester: 'Student', initials: 'ST', status: 'pending', venue: 'Hall', dateISO: '2026-10-19', date: '2026-10-19', time: 'Morning' }]);
      options.onCounts({ total: 101, pending: 55, approved: 40, declined: 6 });
      return () => {};
    } }
  };
  vm.createContext(context); vm.runInContext(fs.readFileSync('js/pages/admin-requests.js', 'utf8'), context); await initialize();
  assert.equal(mounted.isAdmin, true);
  assert.equal(element('all-count').textContent, 101);
  assert.equal(element('pending-count').textContent, 55);
  assert.equal(element('approved-count').textContent, 40);
  assert(element('request-rows').innerHTML.includes('Hall') || [...elements.values()].some(item => item.innerHTML.includes('Hall')));
});
