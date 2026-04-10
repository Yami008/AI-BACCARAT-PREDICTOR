const STORAGE_KEY = 'baccarat_analyzer_state_v3';

const state = {
    history: [],
    currentStep: 1,
    lastPredictedSide: null,
    baseBet: 100,
};

const MAX_STEP = 8;

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    loadState();
    renderAll();
});

function cacheElements() {
    elements.roadMap = document.getElementById('road-map');
    elements.nextPrediction = document.getElementById('next-prediction');
    elements.confidencePct = document.getElementById('confidence-pct');
    elements.confidenceBar = document.getElementById('confidence-bar');
    elements.predictionNote = document.getElementById('prediction-note');
    elements.totalHands = document.getElementById('total-hands');
    elements.pCount = document.getElementById('p-count');
    elements.tCount = document.getElementById('t-count');
    elements.bCount = document.getElementById('b-count');
    elements.stepCount = document.getElementById('step-count');
    elements.betAmount = document.getElementById('bet-amount');
    elements.baseBetDisplay = document.getElementById('base-bet-display');
    elements.statusBadge = document.getElementById('status-badge');
    elements.lastSix = document.getElementById('last-six');
    elements.lastPredictionText = document.getElementById('last-prediction-text');
    elements.storageStatus = document.getElementById('storage-status');

    elements.undoBtn = document.getElementById('undo-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.resetStepBtn = document.getElementById('reset-step-btn');
    elements.setBaseBetBtn = document.getElementById('set-base-bet-btn');
    elements.exportBtn = document.getElementById('export-btn');
    elements.importBtn = document.getElementById('import-btn');

    elements.resultButtons = document.querySelectorAll('[data-result]');
    elements.baseBetModal = document.getElementById('base-bet-modal');
elements.baseBetInput = document.getElementById('base-bet-input');
elements.closeBaseBetModal = document.getElementById('close-base-bet-modal');
elements.cancelBaseBetBtn = document.getElementById('cancel-base-bet-btn');
elements.saveBaseBetBtn = document.getElementById('save-base-bet-btn');

elements.clearHistoryModal = document.getElementById('clear-history-modal');
elements.closeClearModal = document.getElementById('close-clear-modal');
elements.cancelClearBtn = document.getElementById('cancel-clear-btn');
elements.confirmClearBtn = document.getElementById('confirm-clear-btn');
}

function bindEvents() {
    elements.resultButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const result = button.dataset.result;
            record(result);
        });
    });
    elements.baseBetInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        saveBaseBetFromModal();
    }
    });

    elements.undoBtn.addEventListener('click', undo);
    elements.clearBtn.addEventListener('click', clearHistory);
    elements.resetStepBtn.addEventListener('click', resetStep);
    elements.setBaseBetBtn.addEventListener('click', setBaseBet);
    elements.exportBtn.addEventListener('click', exportHistory);
    elements.importBtn.addEventListener('click', importHistory);

    document.addEventListener('keydown', handleKeyboardShortcuts);
    elements.closeBaseBetModal.addEventListener('click', closeBaseBetModal);
    elements.cancelBaseBetBtn.addEventListener('click', closeBaseBetModal);
    elements.saveBaseBetBtn.addEventListener('click', saveBaseBetFromModal);

    elements.closeClearModal.addEventListener('click', closeClearHistoryModal);
    elements.cancelClearBtn.addEventListener('click', closeClearHistoryModal);
    elements.confirmClearBtn.addEventListener('click', confirmClearHistory);

    elements.baseBetModal.addEventListener('click', (event) => {
        if (event.target === elements.baseBetModal) {
            closeBaseBetModal();
        }
    });

    elements.clearHistoryModal.addEventListener('click', (event) => {
        if (event.target === elements.clearHistoryModal) {
            closeClearHistoryModal();
        }
    });
}

function handleKeyboardShortcuts(event) {
    const key = event.key.toLowerCase();

    if (key === 'p') record('P');
    if (key === 't') record('T');
    if (key === 'b') record('B');
    if (key === 'z') undo();
}

function record(result) {
    if (!['P', 'T', 'B'].includes(result)) return;

    // เดินเงินเฉพาะกรณีมี prediction ก่อนหน้า และผลไม่ใช่ Tie
    if (state.lastPredictedSide && result !== 'T') {
        if (result === state.lastPredictedSide) {
            state.currentStep = 1;
        } else {
            state.currentStep = state.currentStep >= MAX_STEP ? 1 : state.currentStep + 1;
        }
    }

    state.history.push(result);
    renderAll();
    saveState();
}

function undo() {
    if (state.history.length === 0) return;

    state.history.pop();

    if (state.currentStep > 1) {
        state.currentStep--;
    }

    // ถ้าเหลือข้อมูลน้อยเกินไป ให้รีเซ็ตฝั่งที่เคยทำนาย
    if (state.history.length < 3) {
        state.lastPredictedSide = null;
    }

    renderAll();
    saveState();
}

function clearHistory() {
    if (state.history.length === 0) return;
    elements.clearHistoryModal.classList.remove('hidden');
}

function resetStep() {
    state.currentStep = 1;
    renderMoneyManagement();
    saveState();
}

function setBaseBet() {
    elements.baseBetInput.value = state.baseBet;
    elements.baseBetModal.classList.remove('hidden');

    setTimeout(() => {
        elements.baseBetInput.focus();
        elements.baseBetInput.select();
    }, 10);
}

function renderAll() {
    renderRoadmap();
    renderStats();
    renderMoneyManagement();
    renderPrediction();
    renderSummary();
    updateActionButtons();
}

function renderRoadmap() {
    elements.roadMap.innerHTML = '';

    state.history.forEach((result) => {
        const bead = document.createElement('div');
        bead.className = `bead ${getBeadClass(result)}`;
        bead.textContent = result;
        elements.roadMap.appendChild(bead);
    });

    requestAnimationFrame(() => {
        elements.roadMap.scrollLeft = elements.roadMap.scrollWidth;
    });

    elements.totalHands.textContent = `TOTAL: ${state.history.length}`;
}

function renderStats() {
    elements.pCount.textContent = countResult('P');
    elements.tCount.textContent = countResult('T');
    elements.bCount.textContent = countResult('B');
}

function renderMoneyManagement() {
    const multiplier = Math.pow(2, state.currentStep - 1);
    const bet = state.baseBet * multiplier;

    elements.stepCount.textContent = String(state.currentStep);
    elements.betAmount.textContent = formatMoney(bet);
    elements.baseBetDisplay.textContent = formatMoney(state.baseBet);
}

function renderPrediction() {
    if (state.history.length < 3) {
        state.lastPredictedSide = null;

        elements.nextPrediction.innerHTML = `
            <span class="text-slate-500 text-xs italic">Waiting for data...</span>
        `;
        elements.confidencePct.textContent = '0%';
        elements.confidenceBar.style.width = '0%';
        elements.predictionNote.textContent = 'ต้องมีข้อมูลอย่างน้อย 3 ตาก่อนเริ่มประมวลผล';

        setBadge('Idle', 'idle');
        elements.lastPredictionText.textContent = '-';
        return;
    }

    const prediction = calculatePredictionFromHistory();
    state.lastPredictedSide = prediction.side;

    const colorClass = prediction.side === 'P' ? 'text-blue-500' : 'text-red-500';

    elements.nextPrediction.innerHTML = `
        <span class="text-[10px] text-slate-400 font-bold mb-1">NEXT SIDE</span>
        <span class="text-3xl md:text-4xl font-black ${colorClass} pulse tracking-widest">
            ${prediction.side === 'P' ? 'PLAYER' : 'BANKER'}
        </span>
    `;

    elements.confidencePct.textContent = `${prediction.confidence}%`;
    elements.confidenceBar.style.width = `${prediction.confidence}%`;
    elements.predictionNote.textContent = prediction.note;
    elements.lastPredictionText.textContent = prediction.side === 'P' ? 'PLAYER' : 'BANKER';

    if (prediction.confidence >= 80) {
        setBadge('Hot', 'hot');
    } else {
        setBadge('Ready', 'ready');
    }
}

function renderSummary() {
    const lastSix = state.history.slice(-6).join(' ');
    elements.lastSix.textContent = lastSix || '-';
    elements.storageStatus.textContent = 'Yes';
}

function updateActionButtons() {
    const hasHistory = state.history.length > 0;
    elements.undoBtn.disabled = !hasHistory;
    elements.clearBtn.disabled = !hasHistory;
}

function calculatePredictionFromHistory() {
    const recent = state.history.slice(-3).join('');
    const lastFive = state.history.slice(-5);
    const pCount = countResult('P');
    const bCount = countResult('B');

    if (recent === 'BBB') {
        return {
            side: 'P',
            confidence: 85,
            note: 'พบ Banker ติดกัน 3 ครั้ง จึงเด้งฝั่งตรงข้ามตาม logic ที่ตั้งไว้',
        };
    }

    if (recent === 'PPP') {
        return {
            side: 'B',
            confidence: 85,
            note: 'พบ Player ติดกัน 3 ครั้ง จึงเด้งฝั่งตรงข้ามตาม logic ที่ตั้งไว้',
        };
    }

    if (recent.includes('PBP')) {
        return {
            side: 'B',
            confidence: 65,
            note: 'แพทเทิร์น 3 ตาล่าสุดคล้ายสลับ จึงเอนฝั่ง Banker',
        };
    }

    const streak = getLatestStreak();
    if (streak.side && streak.count >= 2 && streak.side !== 'T') {
        return {
            side: streak.side === 'P' ? 'B' : 'P',
            confidence: 72,
            note: `พบ ${streak.side} ติดกัน ${streak.count} ครั้ง จึงเลือกเด้งอีกฝั่ง`,
        };
    }

    if (lastFive.filter((x) => x === 'P').length >= 4) {
        return {
            side: 'B',
            confidence: 74,
            note: '5 ตาล่าสุดออก Player เด่น จึงเอนไป Banker',
        };
    }

    if (lastFive.filter((x) => x === 'B').length >= 4) {
        return {
            side: 'P',
            confidence: 74,
            note: '5 ตาล่าสุดออก Banker เด่น จึงเอนไป Player',
        };
    }

    if (pCount > bCount) {
        return {
            side: 'B',
            confidence: 58,
            note: 'ภาพรวม Player มากกว่า Banker เล็กน้อย จึงเอนฝั่งตรงข้ามแบบเบา ๆ',
        };
    }

    if (bCount > pCount) {
        return {
            side: 'P',
            confidence: 58,
            note: 'ภาพรวม Banker มากกว่า Player เล็กน้อย จึงเอนฝั่งตรงข้ามแบบเบา ๆ',
        };
    }

    return {
        side: Math.random() > 0.5 ? 'P' : 'B',
        confidence: 50,
        note: 'ข้อมูลยังไม่ชัดเจน จึงสุ่มฝั่งแบบกลาง ๆ',
    };
}

function getLatestStreak() {
    if (state.history.length === 0) {
        return { side: null, count: 0 };
    }

    const last = state.history[state.history.length - 1];
    let count = 0;

    for (let i = state.history.length - 1; i >= 0; i--) {
        if (state.history[i] === last) {
            count++;
        } else {
            break;
        }
    }

    return { side: last, count };
}

function countResult(result) {
    return state.history.filter((item) => item === result).length;
}

function getBeadClass(result) {
    if (result === 'P') return 'bg-player';
    if (result === 'B') return 'bg-banker';
    return 'bg-tie';
}

function setBadge(text, type) {
    elements.statusBadge.textContent = text;
    elements.statusBadge.className = `badge badge-${type}`;
}

function formatMoney(number) {
    return Number(number).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Save failed:', error);
        elements.storageStatus.textContent = 'No';
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);

        state.history = Array.isArray(parsed.history) ? parsed.history : [];
        state.currentStep = Number.isFinite(parsed.currentStep) ? parsed.currentStep : 1;
        state.lastPredictedSide = parsed.lastPredictedSide || null;
        state.baseBet = Number.isFinite(parsed.baseBet) && parsed.baseBet > 0 ? parsed.baseBet : 100;
    } catch (error) {
        console.error('Load failed:', error);
    }
}

function exportHistory() {
    if (state.history.length === 0) {
        alert('ยังไม่มีข้อมูลให้ export');
        return;
    }

    const payload = {
        history: state.history,
        currentStep: state.currentStep,
        baseBet: state.baseBet,
        exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baccarat-history.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importHistory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);

                if (!Array.isArray(parsed.history)) {
                    throw new Error('Invalid history format');
                }

                state.history = parsed.history.filter((item) => ['P', 'T', 'B'].includes(item));
                state.currentStep = Number.isFinite(parsed.currentStep) ? parsed.currentStep : 1;
                state.baseBet = Number.isFinite(parsed.baseBet) && parsed.baseBet > 0 ? parsed.baseBet : 100;
                state.lastPredictedSide = null;

                renderAll();
                saveState();
            } catch (error) {
                alert('ไฟล์ไม่ถูกต้อง หรือรูปแบบข้อมูลไม่รองรับ');
                console.error(error);
            }
        };

        reader.readAsText(file);
    });

    input.click();
}

function closeBaseBetModal() {
    elements.baseBetModal.classList.add('hidden');
}

function saveBaseBetFromModal() {
    const value = Number(elements.baseBetInput.value);

    if (!Number.isFinite(value) || value <= 0) {
        alert('กรุณากรอกตัวเลขที่มากกว่า 0');
        elements.baseBetInput.focus();
        return;
    }

    state.baseBet = value;
    renderMoneyManagement();
    saveState();
    closeBaseBetModal();
}

function closeClearHistoryModal() {
    elements.clearHistoryModal.classList.add('hidden');
}

function confirmClearHistory() {
    state.history = [];
    state.currentStep = 1;
    state.lastPredictedSide = null;

    renderAll();
    saveState();
    closeClearHistoryModal();
}