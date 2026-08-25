// ==========================================================================
// CORE - UTILITIES (TOASTS, MODALS, STATUS TOGGLE)
// ==========================================================================

// Toast Notifications
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#22c55e;"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// User Status Online/Ausente Toggle
let isOnline = true;
function toggleUserStatus() {
  isOnline = !isOnline;
  const dot = document.getElementById('headerStatusDot');
  const text = document.getElementById('headerStatusText');
  if (isOnline) {
    if (dot) dot.style.backgroundColor = '#22c55e';
    if (text) text.innerText = 'Online';
    showToast('Status alterado para: Online');
  } else {
    if (dot) dot.style.backgroundColor = '#f59e0b';
    if (text) text.innerText = 'Ausente';
    showToast('Status alterado para: Ausente');
  }
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}
