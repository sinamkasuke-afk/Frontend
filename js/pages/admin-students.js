document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!await FRMS.requireUser(true)) return;
    const base = await FRMS.studentQuery();
    const body = document.getElementById('student-rows');
    const previous = document.getElementById('students-previous'), next = document.getElementById('students-next');
    const search = document.getElementById('global-search');
    if (search) search.placeholder = 'Search students on this page...';
    function applySearch() {
      const text = (search?.value || '').trim().toLowerCase();
      for (const row of body.rows) row.hidden = !row.textContent.toLowerCase().includes(text);
    }
    search?.addEventListener('input', applySearch);
    let rows = [];
    const pager = FRMS_REQUEST_PAGINATION.create({ base, onError: FRMS.showError, onChange: state => {
      rows = state.docs.map(doc => ({ ...doc.data(), uid: doc.id }));
      previous.disabled = !state.hasPrevious; next.disabled = !state.hasNext;
      document.getElementById('students-page').textContent = `Page ${state.page}`;
      body.replaceChildren();
      for (const student of rows) {
        const row = document.createElement('tr');
        for (const value of [student.displayName, student.email, student.studentId || 'Not supplied', student.enrollmentStatus || 'pending']) {
          const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
        }
        const actions = document.createElement('td');
        for (const [label, approved] of [['Approve', true], ['Reject', false]]) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
          button.style.cssText = 'margin:4px;padding:8px 12px;border-radius:8px;border:1px solid #ddd';
          button.onclick = async () => {
            const studentId = window.prompt('Enter or confirm the student ID checked against school records. Give this ID to the student to confirm in their portal:', student.studentId || '');
            if (!studentId) return;
            if (!window.confirm(`${label} enrollment for ${student.displayName || student.email}? Confirm that you have checked school records.`)) return;
            button.disabled = true;
            try { await FRMS.approveEnrollment(student.uid, studentId.trim(), approved); }
            catch (error) { button.disabled = false; FRMS.showError(error); }
          };
          actions.append(button);
        }
        row.append(actions); body.append(row);
      }
      applySearch();
    } });
    previous.onclick = () => pager.previous(); next.onclick = () => pager.next();
    pager.start();
    window.addEventListener('pagehide', () => pager.close(), { once: true });
  } catch (error) { FRMS.showError(error); }
});
