console.log('script.js loaded'); // 🔴 PROOF #1

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready'); // 🔴 PROOF #2

  const form = document.getElementById('projectForm');
  const feeModal = document.getElementById('feeModal');

  if (!form) {
    console.error('Form not found');
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Submit clicked'); // 🔴 PROOF #3
    feeModal.classList.remove('hidden');
  });
});
