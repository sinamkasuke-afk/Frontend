const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function page() {
  const elements = new Map(), calls = [];
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value: '', hidden: id === 'register-section', disabled: false, type: 'password', textContent: '', listeners: {},
      addEventListener(type, handler) { this.listeners[type] = handler; },
      setAttribute() {}, focus() { this.focused = true; }, querySelector() { return element('login-button'); } });
    return elements.get(id);
  }
  const context = { window: {}, renderNavbar() {}, document: { getElementById: element }, location: {},
    FRMS: { register: async (...args) => calls.push(args), login: async () => {}, showError() {} } };
  vm.createContext(context);
  // Classic script tags share one global scope, just like the actual login page.
  vm.runInContext(fs.readFileSync('js/firebase/reservation-service.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('js/pages/login.js', 'utf8'), context);
  return { element, context, calls };
}
test('shared reservation script and login script coexist; register button opens and closes form', () => {
  const { element, context } = page();
  assert(context.window.FRMS_RESERVATION_SERVICE);
  element('open-register').listeners.click();
  assert.equal(element('register-section').hidden, false);
  assert.equal(element('login-form').hidden, true);
  assert.equal(element('register-name').focused, true);
  element('back-to-login').listeners.click();
  assert.equal(element('register-section').hidden, true);
  assert.equal(element('login-form').hidden, false);
});
test('registration submit validates confirmation and calls Firebase registration', async () => {
  const { element, context, calls } = page();
  element('register-student-id').value = '2026-001'; element('register-name').value = 'Alex Student'; element('register-email').value = 'alex@example.com';
  element('register-password').value = 'TestPass123!'; element('register-confirm').value = 'different';
  await element('register-form').listeners.submit({ preventDefault() {} });
  assert.equal(calls.length, 0); assert.equal(element('register-error').hidden, false);
  element('register-confirm').value = 'TestPass123!';
  await element('register-form').listeners.submit({ preventDefault() {} });
  assert.deepEqual(Array.from(calls[0]), ['Alex Student', 'alex@example.com', 'TestPass123!', '2026-001']);
  assert.equal(context.location.href, 'dashboard.html');
  assert.equal(element('register-submit').disabled, false);
});
