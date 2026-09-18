<template>
  <aside class="tools-sidebar" id="toolsSidebar">
    <!-- Cabeçalho sutil do Sidebar de Ferramentas -->
    <div class="tools-header" title="Barra de Ferramentas Rápidas">
      <div class="tools-header-badge">
        <i class="fa-solid fa-wrench"></i>
      </div>
    </div>

    <!-- Dock Container com os Ícones em Formato de Balões -->
    <div class="tools-dock-track">
      <!-- 1. Balão: Bloco de Notas -->
      <div class="tool-bubble-item">
        <button
          type="button"
          class="tool-bubble-btn"
          :class="{ active: notepad.isOpen, 'has-dirty': hasDirtyTab }"
          title="Notas Rápidas"
          aria-label="Notas Rápidas"
          @click="notepad.toggle"
        >
          <i class="fa-regular fa-note-sticky"></i>
          <span v-if="hasDirtyTab" class="bubble-dot-badge" title="Anotações não salvas"></span>
        </button>
        <div class="tool-bubble-tooltip">
          <span>Notas</span>
        </div>
      </div>

      <div class="tool-dock-divider"></div>

      <!-- 2. Balão: Calculadora Rápida -->
      <div class="tool-bubble-item" ref="calcWrapperRef">
        <button
          type="button"
          class="tool-bubble-btn tool-bubble-secondary"
          :class="{ active: showCalculator }"
          title="Calculadora Rápida"
          aria-label="Calculadora Rápida"
          @click="toggleCalculator"
        >
          <i class="fa-solid fa-calculator"></i>
        </button>
        <div class="tool-bubble-tooltip">
          <span>Calculadora</span>
        </div>

        <!-- Popover Flutuante da Calculadora Rápida -->
        <Teleport to="body">
          <div
            v-if="showCalculator"
            class="calculator-floating-popover"
            @click.stop
          >
            <div class="calc-header">
              <div class="calc-header-title">
                <i class="fa-solid fa-calculator"></i>
                <span>Calculadora</span>
              </div>
              <button type="button" class="calc-close-btn" @click="showCalculator = false" title="Fechar (Esc)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="calc-display-area">
              <div class="calc-history-expr">{{ calcExpr || '&nbsp;' }}</div>
              <div class="calc-main-value">{{ calcDisplay }}</div>
            </div>
            <div class="calc-buttons-grid">
              <button type="button" class="calc-btn calc-op-clear" @click="calcClear">C</button>
              <button type="button" class="calc-btn calc-op" @click="calcBackspace"><i class="fa-solid fa-delete-left"></i></button>
              <button type="button" class="calc-btn calc-op" @click="calcOp('%')">%</button>
              <button type="button" class="calc-btn calc-op" @click="calcOp('/')">÷</button>

              <button type="button" class="calc-btn" @click="calcDigit('7')">7</button>
              <button type="button" class="calc-btn" @click="calcDigit('8')">8</button>
              <button type="button" class="calc-btn" @click="calcDigit('9')">9</button>
              <button type="button" class="calc-btn calc-op" @click="calcOp('*')">×</button>

              <button type="button" class="calc-btn" @click="calcDigit('4')">4</button>
              <button type="button" class="calc-btn" @click="calcDigit('5')">5</button>
              <button type="button" class="calc-btn" @click="calcDigit('6')">6</button>
              <button type="button" class="calc-btn calc-op" @click="calcOp('-')">−</button>

              <button type="button" class="calc-btn" @click="calcDigit('1')">1</button>
              <button type="button" class="calc-btn" @click="calcDigit('2')">2</button>
              <button type="button" class="calc-btn" @click="calcDigit('3')">3</button>
              <button type="button" class="calc-btn calc-op" @click="calcOp('+')">+</button>

              <button type="button" class="calc-btn calc-zero" @click="calcDigit('0')">0</button>
              <button type="button" class="calc-btn" @click="calcDot">,</button>
              <button type="button" class="calc-btn calc-equals" @click="calcEquals">=</button>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- 3. Balão: Atalhos Rápidos do Sistema -->
      <div class="tool-bubble-item" ref="shortcutsWrapperRef">
        <button
          type="button"
          class="tool-bubble-btn tool-bubble-secondary"
          :class="{ active: showShortcuts }"
          title="Atalhos Rápidos"
          aria-label="Atalhos Rápidos"
          @click="toggleShortcuts"
        >
          <i class="fa-solid fa-keyboard"></i>
        </button>
        <div class="tool-bubble-tooltip">
          <span>Atalhos</span>
        </div>

        <!-- Popover Flutuante de Atalhos Rápidos -->
        <Teleport to="body">
          <div
            v-if="showShortcuts"
            class="shortcuts-floating-popover"
            @click.stop
          >
            <div class="shortcuts-header">
              <div class="shortcuts-title">
                <i class="fa-solid fa-keyboard"></i>
                <span>Atalhos Rápidos</span>
              </div>
              <button type="button" class="calc-close-btn" @click="showShortcuts = false" title="Fechar (Esc)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="shortcuts-list">
              <div class="shortcut-row">
                <span class="shortcut-desc">Enviar mensagem</span>
                <kbd class="shortcut-kbd">Enter</kbd>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-desc">Quebra de linha</span>
                <kbd class="shortcut-kbd">Shift + Enter</kbd>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-desc">Mensagens rápidas</span>
                <kbd class="shortcut-kbd">/</kbd>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-desc">Fechar janela/painel</span>
                <kbd class="shortcut-kbd">Esc</kbd>
              </div>
              <div class="shortcut-row">
                <span class="shortcut-desc">Expandir/Recolher menu</span>
                <kbd class="shortcut-kbd">&gt; ou &lt;</kbd>
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>

    <!-- Drawer do Bloco de Notas já existente -->
    <NotepadDrawer />
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotepadStore } from '@/stores/notepad.store'
import NotepadDrawer from '@/components/tools/NotepadDrawer.vue'

const notepad = useNotepadStore()

const hasDirtyTab = computed(() => {
  return notepad.tabs.some(t => t.isDirty)
})

// Estado da Calculadora Rápida
const showCalculator = ref(false)
const calcDisplay = ref('0')
const calcExpr = ref('')
const calcNewNum = ref(true)

function toggleCalculator() {
  showCalculator.value = !showCalculator.value
  if (showCalculator.value) showShortcuts.value = false
}

function calcDigit(d) {
  if (calcNewNum.value || calcDisplay.value === '0') {
    calcDisplay.value = d
    calcNewNum.value = false
  } else {
    if (calcDisplay.value.length < 12) {
      calcDisplay.value += d
    }
  }
}

function calcDot() {
  if (calcNewNum.value) {
    calcDisplay.value = '0.'
    calcNewNum.value = false
  } else if (!calcDisplay.value.includes('.')) {
    calcDisplay.value += '.'
  }
}

function calcClear() {
  calcDisplay.value = '0'
  calcExpr.value = ''
  calcNewNum.value = true
}

function calcBackspace() {
  if (calcNewNum.value) return
  if (calcDisplay.value.length > 1) {
    calcDisplay.value = calcDisplay.value.slice(0, -1)
  } else {
    calcDisplay.value = '0'
    calcNewNum.value = true
  }
}

function calcOp(op) {
  const current = parseFloat(calcDisplay.value) || 0
  if (op === '%') {
    calcDisplay.value = String(current / 100)
    calcNewNum.value = true
    return
  }
  calcExpr.value = `${current} ${op}`
  calcNewNum.value = true
}

function calcEquals() {
  if (!calcExpr.value) return
  try {
    const parts = calcExpr.value.split(' ')
    const prev = parseFloat(parts[0])
    const op = parts[1]
    const current = parseFloat(calcDisplay.value)
    let res = 0
    if (op === '+') res = prev + current
    else if (op === '-') res = prev - current
    else if (op === '*') res = prev * current
    else if (op === '/') res = current !== 0 ? prev / current : 0

    // Arredondar para até 6 casas decimais
    const rounded = Math.round(res * 1000000) / 1000000
    calcDisplay.value = String(rounded)
    calcExpr.value = `${prev} ${op} ${current} =`
    calcNewNum.value = true
  } catch {
    calcDisplay.value = 'Erro'
    calcNewNum.value = true
  }
}

// Estado dos Atalhos Rápidos
const showShortcuts = ref(false)

function toggleShortcuts() {
  showShortcuts.value = !showShortcuts.value
  if (showShortcuts.value) showCalculator.value = false
}

// Fechamento com Esc
function handleKeyDown(e) {
  if (e.key === 'Escape') {
    if (showCalculator.value) showCalculator.value = false
    if (showShortcuts.value) showShortcuts.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.tools-sidebar {
  width: 48px;
  min-width: 48px;
  max-width: 48px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  height: 100vh;
  padding: 14px 0 16px;
  box-sizing: border-box;
  flex-shrink: 0;
  z-index: 60;
  user-select: none;
  position: relative;
  box-shadow: -2px 0 10px rgba(15, 23, 42, 0.02);
}

/* Cabeçalho compacto com ícone */
.tools-header {
  margin-bottom: 12px;
}

.tools-header-badge {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(203, 213, 225, 0.4);
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

/* Dock Container / Trilha dos Balões */
.tools-dock-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: rgba(226, 232, 240, 0.55);
  padding: 8px 5px;
  border-radius: 24px;
  border: 1px solid rgba(203, 213, 225, 0.6);
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.05);
}

/* Item Balão Individual */
.tool-bubble-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Botão em Formato de Balão (Floating Bubble) */
.tool-bubble-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  outline: none;
  padding: 0;
}

.tool-bubble-btn i {
  font-size: 15px;
  transition: all 0.2s ease;
}

.tool-bubble-btn:hover {
  background: #ffffff;
  border-color: #93c5fd;
  color: #2563eb;
  transform: translateY(-2px) scale(1.1);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.2);
}

.tool-bubble-btn:active {
  transform: scale(0.95);
}

/* Balão Ativo */
.tool-bubble-btn.active {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border-color: transparent;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
  transform: scale(1.05);
}

.tool-bubble-btn.active i {
  color: #ffffff;
}

/* Badge de Anotações com Alterações */
.bubble-dot-badge {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: #f59e0b;
  box-shadow: 0 0 0 2px #ffffff;
}

/* Divisória da Dock */
.tool-dock-divider {
  width: 20px;
  height: 1px;
  background: #cbd5e1;
  margin: 2px 0;
  opacity: 0.8;
}

/* Tooltip Balão Flutuante à Esquerda */
.tool-bubble-tooltip {
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%) translateX(6px);
  background: #0f172a;
  color: #ffffff;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 120;
}

.tool-bubble-tooltip::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -4px;
  transform: translateY(-50%);
  border-width: 4px 0 4px 4px;
  border-style: solid;
  border-color: transparent transparent transparent #0f172a;
}

.tool-bubble-item:hover .tool-bubble-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(0);
}

/* Popover Flutuante da Calculadora */
.calculator-floating-popover {
  position: fixed;
  right: 56px;
  top: 60px;
  width: 240px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 14px 38px -6px rgba(15, 23, 42, 0.2), 0 4px 14px -2px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2e8f0;
  z-index: 1500;
  overflow: hidden;
  animation: popover-drop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.calc-header {
  padding: 10px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.calc-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
}

.calc-header-title i {
  color: #2563eb;
  font-size: 13px;
}

.calc-close-btn {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.calc-close-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.calc-display-area {
  padding: 10px 14px;
  background: #f1f5f9;
  text-align: right;
  border-bottom: 1px solid #e2e8f0;
}

.calc-history-expr {
  font-size: 11px;
  color: #64748b;
  min-height: 14px;
}

.calc-main-value {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  font-family: 'Consolas', 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calc-buttons-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 12px;
  background: #ffffff;
}

.calc-btn {
  height: 38px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #1e293b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.calc-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.calc-btn:active {
  transform: scale(0.96);
}

.calc-op {
  background: #f8fafc;
  color: #2563eb;
  font-weight: 700;
}

.calc-op-clear {
  background: #fef2f2;
  color: #ef4444;
  border-color: #fecaca;
}

.calc-zero {
  grid-column: span 2;
}

.calc-equals {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.calc-equals:hover {
  background: #1d4ed8;
}

/* Popover Flutuante de Atalhos */
.shortcuts-floating-popover {
  position: fixed;
  right: 56px;
  top: 100px;
  width: 270px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 14px 38px -6px rgba(15, 23, 42, 0.2), 0 4px 14px -2px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2e8f0;
  z-index: 1500;
  overflow: hidden;
  animation: popover-drop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  padding-bottom: 8px;
}

.shortcuts-header {
  padding: 12px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shortcuts-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.shortcuts-title i {
  color: #2563eb;
}

.shortcuts-list {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.shortcut-desc {
  font-size: 12px;
  color: #475569;
}

.shortcut-kbd {
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 2px 6px;
  color: #1e293b;
  box-shadow: 0 1px 0 #cbd5e1;
}

@keyframes popover-drop {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 768px) {
  .tools-sidebar {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 58;
  }
}
</style>
