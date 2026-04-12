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
        elements.predictionNote.innerHTML = `
            <div class="text-center text-slate-400">
                ต้องมีข้อมูลอย่างน้อย 3 ตาก่อนเริ่มประมวลผล
            </div>
        `;

        setBadge('Idle', 'idle');
        elements.lastPredictionText.textContent = '-';
        return;
    }

    const prediction = calculateAdvancedPrediction();
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
    
    // แสดง note แบบมีหัวข้อ
    const noteLines = prediction.note.split(' | ');
    if (noteLines.length > 1) {
        elements.predictionNote.innerHTML = `
            <div class="space-y-1.5">
                <div class="text-yellow-400 font-bold text-[10px] mb-2 tracking-wider">📊 ANALYSIS FACTORS:</div>
                ${noteLines.map(line => `
                    <div class="flex items-start gap-2">
                        <span class="text-yellow-500 mt-0.5">•</span>
                        <span class="flex-1">${line}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        elements.predictionNote.innerHTML = `
            <div class="flex items-start gap-2">
                <span class="text-yellow-500">•</span>
                <span class="flex-1">${prediction.note}</span>
            </div>
        `;
    }
    
    elements.lastPredictionText.textContent = prediction.side === 'P' ? 'PLAYER' : 'BANKER';

    if (prediction.confidence >= 80) {
        setBadge('Hot', 'hot');
    } else if (prediction.confidence >= 65) {
        setBadge('Ready', 'ready');
    } else {
        setBadge('Idle', 'idle');
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

// ========================================
// ADVANCED PREDICTION ENGINE
// ========================================

function calculateAdvancedPrediction() {
    const scores = {
        P: 0,
        B: 0
    };
    
    const reasons = [];
    
    // 1. Dragon Pattern Detection (ไพ่ออกฝั่งเดียวกันติดกัน 4+ ตา)
    const dragonResult = detectDragon();
    if (dragonResult.detected) {
        const opposite = dragonResult.side === 'P' ? 'B' : 'P';
        scores[opposite] += 25;
        reasons.push(`Dragon ${dragonResult.side} ติดกัน ${dragonResult.count} ตา → เด้งไปฝั่งตรงข้าม`);
    }
    
    // 2. Zigzag Pattern Detection (สลับ P-B-P-B)
    const zigzagResult = detectZigzag();
    if (zigzagResult.detected) {
        scores[zigzagResult.nextSide] += 20;
        reasons.push(`Zigzag Pattern ตรวจพบ → ต่อด้วย ${zigzagResult.nextSide}`);
    }
    
    // 3. Streak Analysis (ตรวจจับแนวโน้มออกฝั่งเดียวกัน)
    const streakResult = analyzeStreak();
    if (streakResult.weight > 0) {
        scores[streakResult.oppositeSide] += streakResult.weight;
        reasons.push(streakResult.reason);
    }
    
    // 4. Short-term Trend (5 ตาล่าสุด)
    const shortTermResult = analyzeShortTerm();
    if (shortTermResult.weight > 0) {
        scores[shortTermResult.suggestedSide] += shortTermResult.weight;
        reasons.push(shortTermResult.reason);
    }
    
    // 5. Long-term Probability (สถิติรวมทั้งหมด)
    const longTermResult = analyzeLongTerm();
    if (longTermResult.weight > 0) {
        scores[longTermResult.suggestedSide] += longTermResult.weight;
        reasons.push(longTermResult.reason);
    }
    
    // 6. Repetition Pattern (รูปแบบซ้ำในประวัติ)
    const repetitionResult = detectRepetition();
    if (repetitionResult.weight > 0) {
        scores[repetitionResult.suggestedSide] += repetitionResult.weight;
        reasons.push(repetitionResult.reason);
    }
    
    // 7. Last 3 Pattern Match
    const last3Result = analyzeLastThree();
    if (last3Result.weight > 0) {
        scores[last3Result.suggestedSide] += last3Result.weight;
        reasons.push(last3Result.reason);
    }
    
    // คำนวณผลรวม
    const totalP = scores.P;
    const totalB = scores.B;
    
    let predictedSide;
    let confidence;
    
    if (totalP === totalB) {
        // คะแนนเท่ากัน ให้เลือกจากฝั่งที่ออกน้อยกว่าในภาพรวม
        const pCount = countResult('P');
        const bCount = countResult('B');
        predictedSide = pCount <= bCount ? 'P' : 'B';
        confidence = 52;
        reasons.push('คะแนนเท่ากัน → เลือกฝั่งที่ออกน้อยกว่า');
    } else {
        predictedSide = totalP > totalB ? 'P' : 'B';
        const maxScore = Math.max(totalP, totalB);
        const minScore = Math.min(totalP, totalB);
        const diff = maxScore - minScore;
        
        // คำนวณ confidence จากส่วนต่าง (scale 50-95%)
        confidence = Math.min(95, 50 + Math.floor(diff * 0.6));
    }
    
    return {
        side: predictedSide,
        confidence: confidence,
        note: reasons.length > 0 ? reasons.join(' | ') : 'วิเคราะห์จากข้อมูลทั่วไป'
    };
}

// ตรวจจับ Dragon (ฝั่งเดียวติดกัน 4+ ตา)
function detectDragon() {
    const streak = getLatestStreak();
    
    if (streak.count >= 4 && streak.side !== 'T') {
        return {
            detected: true,
            side: streak.side,
            count: streak.count
        };
    }
    
    return { detected: false };
}

// ตรวจจับ Zigzag (P-B-P-B สลับกัน)
function detectZigzag() {
    if (state.history.length < 4) return { detected: false };
    
    const last4 = state.history.slice(-4).filter(x => x !== 'T');
    
    if (last4.length < 4) return { detected: false };
    
    // ตรวจสอบว่าสลับกันหรือไม่
    let isZigzag = true;
    for (let i = 1; i < last4.length; i++) {
        if (last4[i] === last4[i - 1]) {
            isZigzag = false;
            break;
        }
    }
    
    if (isZigzag) {
        const lastSide = last4[last4.length - 1];
        const nextSide = lastSide === 'P' ? 'B' : 'P';
        return {
            detected: true,
            nextSide: nextSide
        };
    }
    
    return { detected: false };
}

// วิเคราะห์ Streak (ถ้าออกฝั่งเดียวติดกัน 2-3 ตา)
function analyzeStreak() {
    const streak = getLatestStreak();
    
    if (streak.count >= 2 && streak.count <= 3 && streak.side !== 'T') {
        const oppositeSide = streak.side === 'P' ? 'B' : 'P';
        return {
            oppositeSide: oppositeSide,
            weight: 15,
            reason: `Streak ${streak.side} x${streak.count} → เตรียมเด้ง`
        };
    }
    
    return { weight: 0 };
}

// วิเคราะห์ระยะสั้น (5 ตาล่าสุด)
function analyzeShortTerm() {
    if (state.history.length < 5) return { weight: 0 };
    
    const last5 = state.history.slice(-5);
    const pCount = last5.filter(x => x === 'P').length;
    const bCount = last5.filter(x => x === 'B').length;
    
    if (pCount >= 4) {
        return {
            suggestedSide: 'B',
            weight: 18,
            reason: `5 ตาล่าสุด P ออก ${pCount} ครั้ง → ลดลงไป B`
        };
    }
    
    if (bCount >= 4) {
        return {
            suggestedSide: 'P',
            weight: 18,
            reason: `5 ตาล่าสุด B ออก ${bCount} ครั้ง → ลดลงไป P`
        };
    }
    
    return { weight: 0 };
}

// วิเคราะห์ระยะยาว (สถิติรวม)
function analyzeLongTerm() {
    const pCount = countResult('P');
    const bCount = countResult('B');
    const total = state.history.length;
    
    if (total < 10) return { weight: 0 };
    
    const diff = Math.abs(pCount - bCount);
    const diffPercent = (diff / total) * 100;
    
    // ถ้าห่างกันมาก (>15%) ให้เอนฝั่งที่น้อยกว่า
    if (diffPercent > 15) {
        const suggestedSide = pCount < bCount ? 'P' : 'B';
        return {
            suggestedSide: suggestedSide,
            weight: 12,
            reason: `ภาพรวม P:${pCount} B:${bCount} → สมดุลไปฝั่ง ${suggestedSide}`
        };
    }
    
    return { weight: 0 };
}

// ตรวจจับรูปแบบซ้ำ
function detectRepetition() {
    if (state.history.length < 8) return { weight: 0 };
    
    const last3 = state.history.slice(-3).join('');
    const beforeLast3 = state.history.slice(-6, -3).join('');
    
    // ถ้า 3 ตาล่าสุดเหมือนกับ 3 ตาก่อนหน้า
    if (last3 === beforeLast3 && state.history.length >= 7) {
        const next = state.history[state.history.length - 6 + 3]; // ตาที่ตามหลัง pattern เก่า
        if (next && next !== 'T') {
            return {
                suggestedSide: next,
                weight: 16,
                reason: `Pattern ${last3} ซ้ำ → ตามด้วย ${next}`
            };
        }
    }
    
    return { weight: 0 };
}

// วิเคราะห์ 3 ตาล่าสุด
function analyzeLastThree() {
    const last3 = state.history.slice(-3).join('');
    
    // PPP -> B
    if (last3 === 'PPP') {
        return {
            suggestedSide: 'B',
            weight: 22,
            reason: 'PPP ติดกัน → เด้ง B'
        };
    }
    
    // BBB -> P
    if (last3 === 'BBB') {
        return {
            suggestedSide: 'P',
            weight: 22,
            reason: 'BBB ติดกัน → เด้ง P'
        };
    }
    
    // PBP -> B
    if (last3 === 'PBP') {
        return {
            suggestedSide: 'B',
            weight: 14,
            reason: 'PBP รูปแบบ → ต่อด้วย B'
        };
    }
    
    // BPB -> P
    if (last3 === 'BPB') {
        return {
            suggestedSide: 'P',
            weight: 14,
            reason: 'BPB รูปแบบ → ต่อด้วย P'
        };
    }
    
    return { weight: 0 };
}

// ========================================
// HELPER FUNCTIONS
// ========================================

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