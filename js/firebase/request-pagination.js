(() => {
  const PAGE_SIZE = 25;
  function query(base, filters = {}, cursor = null) {
    let result = base;
    const cutoff = firebase.firestore.Timestamp.fromMillis(Date.now() - 48 * 3600000);
    if (filters.status === 'expired') result = result.where('status', 'in', ['pending', 'expired']).where('createdAt', '<=', cutoff);
    else if (filters.status && filters.status !== 'all') {
      result = result.where('status', '==', filters.status);
      if (filters.status === 'pending') result = result.where('createdAt', '>', cutoff);
    }
    if (filters.month && filters.month !== 'all') {
      const [year, month] = filters.month.split('-').map(Number);
      const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
      result = result.where('dateISO', '>=', filters.month + '-01').where('dateISO', '<', end).orderBy('dateISO', 'desc');
    }
    result = result.orderBy('createdAt', 'desc').orderBy(firebase.firestore.FieldPath.documentId(), 'desc');
    if (cursor) result = result.startAfter(cursor);
    return result.limit(PAGE_SIZE + 1);
  }
  function create({ base, onChange, onError }) {
    let filters = {}, cursors = [null], page = 0, stop = () => {}, generation = 0, closed = false;
    let last = null, hasNext = false;
    function listen() {
      stop();
      const current = ++generation;
      stop = query(base, filters, cursors[page]).onSnapshot(snapshot => {
        if (closed || current !== generation) return;
        const docs = snapshot.docs.slice(0, PAGE_SIZE);
        last = docs.at(-1) || null;
        hasNext = snapshot.docs.length > PAGE_SIZE;
        onChange({ docs, page: page + 1, hasNext, hasPrevious: page > 0 });
      }, error => { if (!closed && current === generation) onError(error); });
    }
    return {
      start(value = {}) { filters = { ...value }; page = 0; cursors = [null]; listen(); },
      next() { if (!hasNext || !last) return; cursors[++page] = last; listen(); },
      previous() { if (page <= 0) return; page--; listen(); },
      close() { closed = true; generation++; stop(); }
    };
  }
  window.FRMS_REQUEST_PAGINATION = { query, create, PAGE_SIZE };
})();
