const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('student list shows approved requests by default and refreshes rows and counts live', async () => {
  const elements = new Map(); let initialize, refresh;
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value: '', innerHTML: '', textContent: '', hidden: false, addEventListener() {} });
    return elements.get(id);
  }
  const row = { id: 'request-1', venue: 'Hall', event: 'Student event', status: 'approved' };
  const context = {
    document: { getElementById: element, querySelectorAll: () => [], addEventListener: (type, callback) => { initialize = callback; } },
    window: { addEventListener() {} }, renderNavbar() {},
    FRMS: { requireUser: async () => true, requests: async () => [row],
      watchRequests: async callback => { refresh = callback; return () => {}; },
      showError: error => { throw error; } }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/pages/my-requests.js', 'utf8'), context);
  await initialize();
  assert(element('request-table-body').innerHTML.includes('Student event'));
  assert(element('request-table-body').innerHTML.includes('data-cancel-reservation="request-1"'));
  assert.equal(element('requests-empty').hidden, true);
  assert.equal(element('approved-count').textContent, 1);
  refresh([{ ...row, status: 'declined' }]);
  assert(element('request-table-body').innerHTML.includes('Declined'));
  assert.equal(element('approved-count').textContent, 0);
  assert.equal(element('declined-count').textContent, 1);
  refresh([]);
  assert.equal(element('requests-empty').hidden, false);
  assert.equal(element('all-tab-count').textContent, 0);
});
