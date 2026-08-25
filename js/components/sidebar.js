// ==========================================================================
// COMPONENTS - SIDEBAR CONTROLLER
// ==========================================================================

let isSidebarCollapsed = false;

function toggleSidebar() {
  const sidebar = document.getElementById('mainSidebar');
  const btn = document.getElementById('sidebarToggleBtn');
  const btnText = document.querySelector('.sidebar-footer-text');
  const icon = document.getElementById('sidebarToggleIcon');

  isSidebarCollapsed = !isSidebarCollapsed;
  if (sidebar) sidebar.classList.toggle('collapsed', isSidebarCollapsed);

  if (isSidebarCollapsed) {
    if (btnText) btnText.innerText = '';
    if (icon) icon.className = 'fa-solid fa-chevron-right';
    if (btn) btn.title = 'Expandir menu lateral';
  } else {
    if (btnText) btnText.innerText = 'Recolher menu';
    if (icon) icon.className = 'fa-solid fa-chevron-left';
    if (btn) btn.title = 'Recolher menu lateral';
  }
}
