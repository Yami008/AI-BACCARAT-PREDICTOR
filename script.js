const STORAGE_KEY = 'baccarat_analyzer_state_v7';

const DEFAULT_PATTERN_STATS = () => ({
    dragon_follow: { win: 0, lose: 0 },
    dragon_cut: { win: 0, lose: 0 },
    zigzag: { win: 0, lose: 0 },
    momentum: { win: 0, lose: 0 },
    longTerm: { win: 0, lose: 0 },
    repetition: { win: 0, lose: 0 },
    last3_flow: { win: 0, lose: 0 }
});

const state = {
    history: [],
    currentStep: 1,
    lastPredictedSide: null,
    lastPredictionMeta: null,
    baseBet: 100,
    predictionResults: [],
    patternStats: DEFAULT_PATTERN_STATS(),
    stats: {
        totalPredictions: 0,
        correctPredictions: 0,
        wrongPredictions: 0,
        winRate: 0
    }
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

    elements.winRate = document.getElementById('win-rate');
    elements.correctCount = document.getElementById('correct-count');
    elements.wrongCount = document.getElementById('wrong-count');
    elements.totalPredictions = document.getElementById('total-predictions');
    elements.last10Results = document.getElementById('last-10-results');

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
            record(button.dataset.result);
        });
    });

    elements.baseBetInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') saveBaseBetFromModal();
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

    if (state.lastPredictionMeta && result !== 'T') {
        // ถ้า AI สั่งให้ WAIT (รอ) จะไม่นับว่าแพ้หรือชนะ และไม่ขยับ Step
        if (state.lastPredictionMeta.side === 'WAIT') {
            state.history.push(result);
            renderAll();
            saveState();
            return;
        }

        const isCorrect = result === state.lastPredictionMeta.side;

        state.predictionResults.push({
            predicted: state.lastPredictionMeta.side,
            actual: result,
            correct: isCorrect,
            patterns: Array.isArray(state.lastPredictionMeta.usedPatterns) ? [...state.lastPredictionMeta.usedPatterns] : [],
            confidence: state.lastPredictionMeta.confidence || 0,
            timestamp: new Date().toISOString()
        });

        updatePatternStats(state.lastPredictionMeta.usedPatterns, isCorrect);
        updatePredictionStats();

        if (isCorrect) {
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
    const removed = state.history.pop();

    if (removed !== 'T' && state.lastPredictionMeta && state.lastPredictionMeta.side !== 'WAIT' && state.predictionResults.length > 0) {
        // ถ้ามีการทำนายก่อนหน้านี้ที่ไม่ใช่ WAIT ถึงจะให้ถอยกลับสถิติ
        const lastRecord = state.predictionResults.pop();

        if (lastRecord && Array.isArray(lastRecord.patterns)) {
            for (const patternName of new Set(lastRecord.patterns)) {
                ensurePatternStat(patternName);
                if (lastRecord.correct) {
                    state.patternStats[patternName].win = Math.max(0, state.patternStats[patternName].win - 1);
                } else {
                    state.patternStats[patternName].lose = Math.max(0, state.patternStats[patternName].lose - 1);
                }
            }
        }
        updatePredictionStats();
        
        if (state.currentStep > 1) {
            state.currentStep--;
        } else {
            state.currentStep = 1;
        }
    }

    if (state.history.length < 3) {
        state.lastPredictedSide = null;
        state.lastPredictionMeta = null;
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
    setTimeout(() => { elements.baseBetInput.focus(); elements.baseBetInput.select(); }, 10);
}

function renderAll() {
    renderRoadmap();
    renderStats();
    renderMoneyManagement();
    renderPrediction();
    renderPredictionStats();
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
    requestAnimationFrame(() => { elements.roadMap.scrollLeft = elements.roadMap.scrollWidth; });
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
        state.lastPredictionMeta = null;

        elements.nextPrediction.innerHTML = `<span class="text-slate-500 text-xs italic">Waiting for data...</span>`;
        elements.confidencePct.textContent = '0%';
        elements.confidenceBar.style.width = '0%';
        elements.predictionNote.innerHTML = `<div class="text-center text-slate-400">ต้องมีข้อมูลอย่างน้อย 3 ตาก่อนเริ่มประมวลผล</div>`;
        setBadge('Idle', 'idle');
        elements.lastPredictionText.textContent = '-';
        return;
    }

    const prediction = calculateAdvancedPrediction();
    state.lastPredictedSide = prediction.side;
    state.lastPredictionMeta = prediction;

    if (prediction.side === 'WAIT') {
        elements.nextPrediction.innerHTML = `
            <span class="text-[10px] text-slate-400 font-bold mb-1">NEXT SIDE</span>
            <span class="text-3xl md:text-4xl font-black text-slate-400 tracking-widest pulse">
                SKIP (รอ)
            </span>
        `;
        elements.lastPredictionText.textContent = 'WAIT';
        setBadge('Idle', 'idle');
    } else {
        const colorClass = prediction.side === 'P' ? 'text-blue-500' : 'text-red-500';
        elements.nextPrediction.innerHTML = `
            <span class="text-[10px] text-slate-400 font-bold mb-1">NEXT SIDE</span>
            <span class="text-3xl md:text-4xl font-black ${colorClass} pulse tracking-widest">
                ${prediction.side === 'P' ? 'PLAYER' : 'BANKER'}
            </span>
        `;
        elements.lastPredictionText.textContent = prediction.side === 'P' ? 'PLAYER' : 'BANKER';
        
        if (prediction.confidence >= 80) setBadge('Hot', 'hot');
        else if (prediction.confidence >= 65) setBadge('Ready', 'ready');
        else setBadge('Idle', 'idle');
    }

    elements.confidencePct.textContent = `${prediction.confidence}%`;
    elements.confidenceBar.style.width = `${prediction.confidence}%`;

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
        elements.predictionNote.innerHTML = `<div class="flex items-start gap-2"><span class="text-yellow-500">•</span><span class="flex-1">${prediction.note}</span></div>`;
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

function updatePredictionStats() {
    const total = state.predictionResults.length;
    const correct = state.predictionResults.filter(r => r.correct).length;
    const wrong = total - correct;
    const winRate = total > 0 ? Math.round((correct / total) * 100) : 0;

    state.stats = { totalPredictions: total, correctPredictions: correct, wrongPredictions: wrong, winRate: winRate };
}

function updatePatternStats(patternNames, isCorrect) {
    if (!Array.isArray(patternNames) || patternNames.length === 0) return;
    for (const patternName of new Set(patternNames)) {
        ensurePatternStat(patternName);
        if (isCorrect) state.patternStats[patternName].win += 1;
        else state.patternStats[patternName].lose += 1;
    }
}

function ensurePatternStat(patternName) {
    if (!state.patternStats[patternName]) state.patternStats[patternName] = { win: 0, lose: 0 };
}

function renderPredictionStats() {
    if (!elements.winRate) return;
    elements.totalPredictions.textContent = state.stats.totalPredictions;
    elements.correctCount.textContent = state.stats.correctPredictions;
    elements.wrongCount.textContent = state.stats.wrongPredictions;
    elements.winRate.textContent = `${state.stats.winRate}%`;

    if (state.stats.winRate >= 60) elements.winRate.className = 'text-2xl font-black text-green-400';
    else if (state.stats.winRate >= 50) elements.winRate.className = 'text-2xl font-black text-yellow-400';
    else if (state.stats.winRate > 0) elements.winRate.className = 'text-2xl font-black text-red-400';
    else elements.winRate.className = 'text-2xl font-black text-slate-400';

    const last10 = state.predictionResults.slice(-10);
    if (last10.length > 0) {
        elements.last10Results.innerHTML = last10.map(result => {
            const icon = result.correct ? '✓' : '✗';
            const color = result.correct ? 'text-green-400' : 'text-red-400';
            return `<span class="${color} font-bold text-sm" title="${result.predicted} → ${result.actual}">${icon}</span>`;
        }).join('');
    } else {
        elements.last10Results.innerHTML = '<span class="text-slate-600 text-xs">-</span>';
    }
}

// --------------------------------------------------------------------------------
// ADVANCED PREDICTION SYSTEM V7 (Trend Follower & Safe Mode)
// --------------------------------------------------------------------------------

function calculateAdvancedPrediction() {
    const scores = { P: 0, B: 0 };
    const reasons = [];
    const usedPatterns = [];

    const recentHistory = getNonTieHistory(20);
    const fullHistory = getNonTieHistory();

    const patternResults = [
        detectDragon(recentHistory),
        detectZigzag(recentHistory),
        analyzeMomentum(recentHistory),
        analyzeLongTerm(fullHistory),
        detectRepetition(fullHistory),
        analyzeLastThreeFlow(recentHistory)
    ];

    for (const result of patternResults) {
        if (!result || !result.suggestedSide) continue;
        const adaptiveWeight = getAdaptiveWeight(result.patternName, result.baseWeight);
        scores[result.suggestedSide] += adaptiveWeight;
        reasons.push(`${result.reason}`);
        usedPatterns.push(result.patternName);
    }

    const totalP = scores.P;
    const totalB = scores.B;
    const diff = Math.abs(totalP - totalB);

    let predictedSide;
    let confidence;

    // ระบบ SAFE MODE: ถ้าน้ำหนักคะแนนต่างกันน้อยกว่า 15 แต้ม แสดงว่าสถิติตีกันเอง ให้ข้าม
    if (totalP === 0 && totalB === 0) {
        predictedSide = 'WAIT';
        confidence = 0;
        reasons.push('ไม่มีข้อมูลเพียงพอ หรือกราฟแกว่ง แนะนำให้ "ข้ามตา" (Skip)');
    } else if (diff < 15) {
        predictedSide = 'WAIT';
        confidence = 50;
        reasons.push('สัญญาณขัดแย้งกัน (P และ B สูสีกันมาก) เสี่ยงเกินไป แนะนำให้ "ข้ามตา" (Skip)');
    } else {
        predictedSide = totalP > totalB ? 'P' : 'B';
        const maxScore = Math.max(totalP, totalB);
        const totalScore = totalP + totalB;
        const dominance = totalScore > 0 ? maxScore / totalScore : 0.5;
        
        confidence = Math.round(50 + (dominance - 0.5) * 80 + Math.min(10, usedPatterns.length * 2));
        confidence = Math.min(95, Math.max(60, confidence));
        
        // กรองอีกชั้น ถ้าความมั่นใจต่ำกว่า 65 ให้บังคับข้าม
        if (confidence < 65) {
            predictedSide = 'WAIT';
            reasons.push('AI ประเมินความแม่นยำต่ำกว่าเกณฑ์ 65% แนะนำให้รอดูเทรนด์ใหม่');
        }
    }

    return {
        side: predictedSide,
        confidence: confidence,
        note: reasons.length > 0 ? reasons.join(' | ') : 'กำลังรวบรวมสถิติ...',
        usedPatterns: [...new Set(usedPatterns)],
        timestamp: new Date().toISOString(),
        scores: { ...scores }
    };
}

function getAdaptiveWeight(patternName, baseWeight) {
    ensurePatternStat(patternName);
    const stat = state.patternStats[patternName];
    const total = stat.win + stat.lose;

    if (total < 3) return baseWeight;

    const winRate = stat.win / total;
    let scale = 0.5 + winRate; 
    if (winRate >= 0.70) scale += 0.2; 
    if (winRate <= 0.40) scale -= 0.3; 

    return Math.max(1, Math.round(baseWeight * scale));
}

// 1. ไหลตามมังกร (ไม่สวนจนกว่าจะยาวมาก)
function detectDragon(history) {
    const streak = getLatestStreak(history);
    if (streak.count >= 3 && streak.side !== 'T') {
        if (streak.count >= 7) {
            return {
                patternName: 'dragon_cut',
                suggestedSide: streak.side === 'P' ? 'B' : 'P',
                baseWeight: 35,
                reason: `มังกร ${streak.side} ยาวเกินไป (${streak.count} ตา) → เตรียมแทงตัด`
            };
        } else {
            return {
                patternName: 'dragon_follow',
                suggestedSide: streak.side,
                baseWeight: 30,
                reason: `เจอเทรนด์มังกร ${streak.side} (${streak.count} ตา) → ไหลตามน้ำอย่าเพิ่งสวน`
            };
        }
    }
    return null;
}

// 2. ปิงปอง
function detectZigzag(history) {
    if (history.length < 4) return null;
    const last4 = history.slice(-4);
    let isZigzag = true;
    for (let i = 1; i < last4.length; i++) {
        if (last4[i] === last4[i - 1]) {
            isZigzag = false;
            break;
        }
    }
    if (isZigzag) {
        const lastSide = last4[last4.length - 1];
        return {
            patternName: 'zigzag',
            suggestedSide: lastSide === 'P' ? 'B' : 'P',
            baseWeight: 25,
            reason: 'เข้าเค้าไพ่ปิงปอง → สลับฝั่งต่อไป'
        };
    }
    return null;
}

// 3. โมเมนตัมระยะสั้น (ตามฝั่งที่กำลังมาแรง)
function analyzeMomentum(history) {
    if (history.length < 5) return null;
    const last5 = history.slice(-5);
    const pCount = last5.filter(x => x === 'P').length;
    const bCount = last5.filter(x => x === 'B').length;

    if (pCount >= 4) {
        return { patternName: 'momentum', suggestedSide: 'P', baseWeight: 20, reason: `ระยะสั้น P กำลังมาแรง (${pCount}/5) → ไหลตาม P` };
    }
    if (bCount >= 4) {
        return { patternName: 'momentum', suggestedSide: 'B', baseWeight: 20, reason: `ระยะสั้น B กำลังมาแรง (${bCount}/5) → ไหลตาม B` };
    }
    return null;
}

function analyzeLongTerm(history) {
    if (history.length < 15) return null;
    const pCount = history.filter(x => x === 'P').length;
    const bCount = history.filter(x => x === 'B').length;
    const total = history.length;
    const diffPercent = (Math.abs(pCount - bCount) / total) * 100;

    if (diffPercent > 20) {
        const weakerSide = pCount < bCount ? 'P' : 'B';
        return {
            patternName: 'longTerm',
            suggestedSide: weakerSide,
            baseWeight: 10,
            reason: `สถิติรวมฝั่ง ${weakerSide} ออกน้อยกว่าปกติมาก → ถ่วงดุลความน่าจะเป็น (LLN)`
        };
    }
    return null;
}

function detectRepetition(history) {
    if (history.length < 6) return null;
    const pattern = history.slice(-3).join('');
    const followUps = [];

    for (let i = 0; i <= history.length - 6; i++) {
        if (history.slice(i, i + 3).join('') === pattern) {
            const next = history[i + 3];
            if (next === 'P' || next === 'B') followUps.push(next);
        }
    }

    if (followUps.length === 0) return null;
    const pCount = followUps.filter(x => x === 'P').length;
    const bCount = followUps.filter(x => x === 'B').length;

    if (pCount === bCount) return null;
    const dominantNext = pCount > bCount ? 'P' : 'B';
    return {
        patternName: 'repetition',
        suggestedSide: dominantNext,
        baseWeight: 15,
        reason: `รูปแบบ ${pattern} ในอดีตมักจะตามด้วย ${dominantNext}`
    };
}

// 4. ตามน้ำ 3 ตาล่าสุด
function analyzeLastThreeFlow(history) {
    if (history.length < 3) return null;
    const last3 = history.slice(-3).join('');

    if (last3 === 'PPP') {
        return { patternName: 'last3_flow', suggestedSide: 'P', baseWeight: 18, reason: 'PPP ติดกัน → เกาะเทรนด์ P ต่อไป' };
    }
    if (last3 === 'BBB') {
        return { patternName: 'last3_flow', suggestedSide: 'B', baseWeight: 18, reason: 'BBB ติดกัน → เกาะเทรนด์ B ต่อไป' };
    }
    return null;
}

function getLastNonTieSide(history = state.history) {
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i] !== 'T') return history[i];
    }
    return null;
}

function getNonTieHistory(limit = null) {
    const filtered = state.history.filter(item => item !== 'T');
    if (typeof limit === 'number') return filtered.slice(-limit);
    return filtered;
}

function getLatestStreak(history = getNonTieHistory()) {
    if (history.length === 0) return { side: null, count: 0 };
    const last = history[history.length - 1];
    let count = 0;
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i] === last) count++;
        else break;
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
    return Number(number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            history: state.history,
            currentStep: state.currentStep,
            lastPredictedSide: state.lastPredictedSide,
            lastPredictionMeta: state.lastPredictionMeta,
            baseBet: state.baseBet,
            predictionResults: state.predictionResults,
            patternStats: state.patternStats,
            stats: state.stats
        }));
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
        state.history = Array.isArray(parsed.history) ? parsed.history.filter(x => ['P', 'T', 'B'].includes(x)) : [];
        state.currentStep = Number.isFinite(parsed.currentStep) ? parsed.currentStep : 1;
        state.lastPredictedSide = parsed.lastPredictedSide || null;
        state.lastPredictionMeta = parsed.lastPredictionMeta || null;
        state.baseBet = Number.isFinite(parsed.baseBet) && parsed.baseBet > 0 ? parsed.baseBet : 100;
        state.predictionResults = Array.isArray(parsed.predictionResults) ? parsed.predictionResults : [];

        const incomingPatternStats = parsed.patternStats && typeof parsed.patternStats === 'object' ? parsed.patternStats : {};
        state.patternStats = DEFAULT_PATTERN_STATS();
        for (const key of Object.keys(state.patternStats)) {
            if (incomingPatternStats[key]) {
                state.patternStats[key].win = Number(incomingPatternStats[key].win) || 0;
                state.patternStats[key].lose = Number(incomingPatternStats[key].lose) || 0;
            }
        }
        updatePredictionStats();
    } catch (error) {
        console.error('Load failed:', error);
        state.patternStats = DEFAULT_PATTERN_STATS();
        updatePredictionStats();
    }
}

function exportHistory() {
    if (state.history.length === 0) { alert('ยังไม่มีข้อมูลให้ export'); return; }
    const payload = {
        history: state.history, currentStep: state.currentStep, lastPredictedSide: state.lastPredictedSide,
        lastPredictionMeta: state.lastPredictionMeta, baseBet: state.baseBet, predictionResults: state.predictionResults,
        patternStats: state.patternStats, stats: state.stats, exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'baccarat-history.json'; a.click(); URL.revokeObjectURL(url);
}

function importHistory() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                if (!Array.isArray(parsed.history)) throw new Error('Invalid format');
                state.history = parsed.history.filter((item) => ['P', 'T', 'B'].includes(item));
                state.currentStep = Number.isFinite(parsed.currentStep) ? parsed.currentStep : 1;
                state.baseBet = Number.isFinite(parsed.baseBet) && parsed.baseBet > 0 ? parsed.baseBet : 100;
                state.lastPredictedSide = parsed.lastPredictedSide || null;
                state.lastPredictionMeta = parsed.lastPredictionMeta || null;
                state.predictionResults = Array.isArray(parsed.predictionResults) ? parsed.predictionResults : [];

                const incomingPatternStats = parsed.patternStats && typeof parsed.patternStats === 'object' ? parsed.patternStats : {};
                state.patternStats = DEFAULT_PATTERN_STATS();
                for (const key of Object.keys(state.patternStats)) {
                    if (incomingPatternStats[key]) {
                        state.patternStats[key].win = Number(incomingPatternStats[key].win) || 0;
                        state.patternStats[key].lose = Number(incomingPatternStats[key].lose) || 0;
                    }
                }
                updatePredictionStats(); renderAll(); saveState();
            } catch (error) { alert('ไฟล์ไม่ถูกต้อง'); console.error(error); }
        };
        reader.readAsText(file);
    });
    input.click();
}

function closeBaseBetModal() { elements.baseBetModal.classList.add('hidden'); }
function saveBaseBetFromModal() {
    const value = Number(elements.baseBetInput.value);
    if (!Number.isFinite(value) || value <= 0) { alert('กรุณากรอกตัวเลขที่มากกว่า 0'); elements.baseBetInput.focus(); return; }
    state.baseBet = value; renderMoneyManagement(); saveState(); closeBaseBetModal();
}
function closeClearHistoryModal() { elements.clearHistoryModal.classList.add('hidden'); }
function confirmClearHistory() {
    state.history = []; state.currentStep = 1; state.lastPredictedSide = null; state.lastPredictionMeta = null;
    state.predictionResults = []; state.patternStats = DEFAULT_PATTERN_STATS();
    state.stats = { totalPredictions: 0, correctPredictions: 0, wrongPredictions: 0, winRate: 0 };
    renderAll(); saveState(); closeClearHistoryModal();
}
