const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('admin calendar navigates months, filters records and includes leap day', async () => {
  const elements = new Map(); let initialize;
  function element(key) {
    if (!elements.has(key)) elements.set(key, {
      innerHTML: '', textContent: '', checked: true, listeners: {},
      addEventListener(type, callback) { this.listeners[type] = callback; },
      replaceChildren(text) { this.textContent = text; }, classList: { toggle() {}, remove() {} }
    });
    return elements.get(key);
  }
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-06T04:00:00Z'])); }
  }
  const document = {
    addEventListener(type, callback) { if (type === 'DOMContentLoaded') initialize = callback; },
    getElementById: element,
    querySelector: element,
    querySelectorAll: () => [element('mini-prev'), element('mini-next')]
  };
  const errors = [];
  const context = { window: { addEventListener() {} }, document, Date: FixedDate, FRMS: {
    requireUser: async () => true,
    requests: async () => [{ id: 'request-1', dateISO: '2028-02-29', status: 'approved', venue: 'Hall', time: 'Morning', event: 'Leap day event' }],
    showError: error => errors.push(error)
  } };
  vm.createContext(context); vm.runInContext(fs.readFileSync('js/pages/admin-calendar.js', 'utf8'), context); await initialize();
  assert.equal(errors.length, 0);
  assert.equal(typeof element('selected-reservations').listeners.click, 'function');
  assert.equal(element('current-month-button').textContent, 'October 2026');
  assert(!element('calendar-grid').innerHTML.includes('Leap day event'));
  for (let month = 0; month < 16; month++) element('next-month').listeners.click();
  assert.equal(element('current-month-button').textContent, 'February 2028');
  assert(element('calendar-grid').innerHTML.includes('data-day="29"'));
  assert(!element('calendar-grid').innerHTML.includes('data-day="30"'));
  assert(element('calendar-grid').innerHTML.includes('Leap day event'));
  element('filter-approved').checked = false; element('filter-approved').listeners.change();
  assert(!element('calendar-grid').innerHTML.includes('Leap day event'));
  element('mini-prev').listeners.click(); assert.equal(element('current-month-button').textContent, 'January 2028');
});
