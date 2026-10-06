const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function moduleForTest() {
  const context = { window: {}, Date, firebase: { firestore: { Timestamp: { fromMillis: value => value }, FieldPath: { documentId: () => '__name__' } } } };
  vm.createContext(context); vm.runInContext(fs.readFileSync('js/firebase/request-pagination.js', 'utf8'), context);
  return context.window.FRMS_REQUEST_PAGINATION;
}
test('pagination reads at most 26 documents, moves through stable cursors, resets on filter change and ignores old callbacks', () => {
  const api = moduleForTest(), queries = [], callbacks = []; let stopped = 0;
  function query(steps = []) {
    const next = (type, args) => query([...steps, [type, ...args]]);
    return { where: (...args) => next('where', args), orderBy: (...args) => next('orderBy', args), limit: (...args) => next('limit', args), startAfter: (...args) => next('startAfter', args),
      onSnapshot(callback) { queries.push(steps); callbacks.push(callback); return () => stopped++; } };
  }
  const states = [], pager = api.create({ base: query().where('ownerUid', '==', 'student1'), onChange: state => states.push(state), onError: error => { throw error; } });
  const docs = Array.from({ length: 26 }, (_, index) => ({ id: 'request-' + index }));
  pager.start(); callbacks[0]({ docs });
  assert.equal(states[0].docs.length, 25); assert.equal(states[0].hasNext, true); assert.equal(states[0].hasPrevious, false);
  assert(queries[0].some(step => step.join('/') === 'limit/26'));
  pager.next(); assert.equal(queries[1].find(step => step[0] === 'startAfter')[1].id, 'request-24');
  callbacks[1]({ docs: docs.slice(0, 3) }); assert.equal(states.at(-1).page, 2); assert.equal(states.at(-1).hasNext, false);
  pager.previous(); callbacks[2]({ docs }); assert.equal(states.at(-1).page, 1);
  pager.start({ status: 'approved', month: '2026-10' });
  assert(!queries[3].some(step => step[0] === 'startAfter'));
  assert(queries[3].some(step => step.join('/') === 'where/status/==/approved'));
  assert(queries[3].some(step => step.join('/') === 'where/dateISO/</2026-11-01'));
  const count = states.length; callbacks[0]({ docs: [] }); assert.equal(states.length, count);
  pager.close(); callbacks[3]({ docs: [] }); assert.equal(states.length, count); assert.equal(stopped, 4);
});
