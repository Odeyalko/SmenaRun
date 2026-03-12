/* iBox Simulator — App Logic v3 (pixel-perfect) */
(function () {
    'use strict';

    const state = {
        timerMode: false, timerStart: 0, timerElapsed: 0, timerInterval: null,
        penalties: 0, currentScreen: 's1', shiftToggled: false,
        correctMPOS: '', selectedModel: null, pvzTabActive: false,
    };

    const readers = [
        { file: '270005091240521000022.glb', mpos: 'MPOS0521000022' },
        { file: '27000509124052101182.glb',  mpos: 'MPOS4052101182' },
        { file: '27000509125070100239.glb',  mpos: 'MPOS5070100239' },
    ];

    const fakeReaders = ['MPOS7831205648','MPOS9012445671','MPOS3378901245','MPOS6654320198'];

    const pvzList = [
        '2.4 Солнечная 27А','1.4 Берёзовая 60','4.15 Цветочная 136',
        '3.33 Кедровая 1А','4.18 Сиреневая 4А','3.20 Лесная 28',
        '3.29 Парковая 24','1.36 Озёрная 1к1','1.15 Речная 24к2',
        '3.35 Полевая 68к1','4.37 Садовая 3к1','3.16 Зелёная 12',
        '4.29 Иванова 36А','2.18 Липовая 82','1.22 Вишнёвая 5','3.41 Дубовая 14к2',
    ];
    const CORRECT_PVZ = '4.29 Иванова 36А';

    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    // Timer
    function startTimer() { state.timerStart = Date.now(); state.timerInterval = setInterval(tick, 100); }
    function tick() { state.timerElapsed = Date.now() - state.timerStart; $('#timer-value').textContent = fmt(state.timerElapsed); }
    function stopTimer() { clearInterval(state.timerInterval); }
    function fmt(ms) {
        const s = Math.floor(ms / 1000), m = Math.floor(s / 60), sec = s % 60, t = Math.floor((ms % 1000) / 100);
        return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${t}`;
    }
    function addPenalty() {
        if (!state.timerMode) return;
        state.penalties++;
        state.timerStart -= 1000;
        const pf = $('#penalty-flash');
        pf.classList.remove('hidden');
        pf.style.animation = 'none'; void pf.offsetHeight; pf.style.animation = '';
        setTimeout(() => pf.classList.add('hidden'), 700);
    }

    // Screens
    function show(id) {
        $$('.scr').forEach(s => s.classList.remove('active'));
        const t = document.getElementById(id);
        if (t) { t.classList.add('active'); state.currentScreen = id; }
    }
    function shake() {
        const s = document.getElementById(state.currentScreen);
        if (s) { s.classList.add('shaking'); setTimeout(() => s.classList.remove('shaking'), 400); }
    }
    function wrongClick(e) {
        addPenalty(); shake();
        const ps = $('#phone-screen');
        const r = ps.getBoundingClientRect();
        const rip = document.createElement('div');
        rip.className = 'wrong-rip';
        rip.style.left = (e.clientX - r.left - 20) + 'px';
        rip.style.top = (e.clientY - r.top - 20) + 'px';
        ps.appendChild(rip);
        setTimeout(() => rip.remove(), 600);
    }

    // Event delegation
    document.addEventListener('click', function (e) {
        const tgt = e.target.closest('[data-action]');
        const wtgt = e.target.closest('[data-wrong]');
        if (wtgt && !tgt) { wrongClick(e); return; }
        if (!tgt) return;
        const a = tgt.dataset.action;
        switch (a) {
            case 'open-ibox': show('s2'); break;
            case 'conn-settings': show('s4'); break;
            case 'printer-off': show('s5'); break;
            case 'select-usb': show('s6'); break;
            case 'perm-ok': show('s7'); break;
            case 'back-to-main': show('s8_5'); break;
            case 'open-menu': show('s9'); break;
            case 'menu-settings': show('s10'); break;
            case 'select-p17': selectP17(); break;
            case 'select-reader': selectReader(); break;
            case 'go-home': show('s1b'); break;
            case 'open-express': show('s12'); break;
            case 'select-russia': show('s13'); initTabs(); break;
            case 'switch-tab': switchToPVZ(); break;
            case 'select-pvz': show('s14'); break;
            case 'start-scan': doScan(); break;
            case 'select-pvz-mode': show('s16'); loadChecks(); break;
            case 'go-main': show('s17'); doFinish(); break;
        }
    });

    // Login
    $('#btn-login').addEventListener('click', function () {
        const em = $('#login-email').value.trim();
        const pw = $('#login-password').value.trim();
        if (em === 'ivan.ivanov@lamoda.ru' && pw === '123123123') {
            show('s3');
        } else {
            addPenalty(); shake();
            if (em !== 'ivan.ivanov@lamoda.ru') { $('#login-email').style.borderBottomColor = '#E53935'; setTimeout(() => { $('#login-email').style.borderBottomColor = ''; }, 1500); }
            if (pw !== '123123123') { $('#login-password').style.borderBottomColor = '#E53935'; setTimeout(() => { $('#login-password').style.borderBottomColor = ''; }, 1500); }
        }
    });
    ['login-email', 'login-password'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-login').click(); });
    });

    // Shift toggle
    const tw = $('#toggle-wrap');
    tw.addEventListener('click', function () {
        if (state.shiftToggled) return;
        state.shiftToggled = true;
        $('#toggle-track').classList.add('tg-on');
        $('#toggle-knob').classList.add('tk-on');
        $('#toggle-char').textContent = '✓';
        $('#shift-txt').textContent = 'Смена открыта';
        $('#shift-txt').classList.add('shift-green');
        spawnReceipt('small', 'СМЕНА ОТКРЫТА\n' + new Date().toLocaleString('ru-RU'));
        setTimeout(() => {
            const b = $('#btn-xreport-closed');
            if (b) b.dataset.action = 'print-x';
        }, 1200);
    });

    document.addEventListener('click', function(e) {
        if (e.target.closest('#btn-xreport-closed')) {
            if (!state.shiftToggled) {
                // User must open the shift first!
                wrongClick(e);
            } else if (e.target.closest('#btn-xreport-closed').dataset.action === 'print-x') {
                printXReport();
            }
        }
        if (e.target.closest('#btn-xreport-open')) {
            printXReport();
        }
    });

    function printXReport() {
        spawnReceipt('big',
            'Х-ОТЧЁТ\n━━━━━━━━━━━━━━\nОрганизация: ООО Ламода\nСмена: #0001\nОператор: Иванов И.И.\n━━━━━━━━━━━━━━\nПР. ИТОГ:     0.00\nВОЗВР. ИТОГ:  0.00\nНАЛИЧН.:      0.00\n━━━━━━━━━━━━━━\n' +
            new Date().toLocaleString('ru-RU')
        );
        setTimeout(() => show('s8'), 2000);
    }

    function spawnReceipt(size, text) {
        const c = $('#receipt-area');
        const r = document.createElement('div');
        r.className = `receipt receipt--${size}`;
        r.textContent = text;
        c.appendChild(r);
        setTimeout(() => r.remove(), 3500);
    }

    // P17 → reader
    function selectP17() {
        const idx = Math.floor(Math.random() * readers.length);
        state.selectedModel = readers[idx];
        state.correctMPOS = state.selectedModel.mpos;

        const mv = $('#reader-model');
        // model-viewer requires HTTP for GLB files
        // Try relative path first, if it fails from file:// it will show fallback
        mv.setAttribute('src', './' + state.selectedModel.file);

        $('#model-container').classList.remove('hidden');
        buildReaders();
        show('s11');
    }

    function buildReaders() {
        const list = $('#reader-list');
        list.innerHTML = '';
        // USB row
        const usb = document.createElement('div');
        usb.className = 'ib-list-row';
        usb.textContent = 'USB';
        usb.dataset.wrong = 'true';
        list.appendChild(usb);

        const all = [...fakeReaders, state.correctMPOS];
        shuffle(all);
        all.forEach(m => {
            const r = document.createElement('div');
            r.className = 'ib-list-row';
            r.textContent = m;
            if (m === state.correctMPOS) r.dataset.action = 'select-reader';
            else r.dataset.wrong = 'true';
            list.appendChild(r);
        });
    }

    function selectReader() {
        $('#model-container').classList.add('hidden');
        show('s10b');
    }

    // Express tabs
    function initTabs() {
        state.pvzTabActive = false;
        $('#tab-sklady').classList.add('active');
        $('#tab-pvz').classList.remove('active');
        $('#pvz-list').innerHTML = '<div style="text-align:center;padding:3rem 1rem;color:#999;">Нет доступных складов</div>';
    }

    function switchToPVZ() {
        if (state.pvzTabActive) return;
        state.pvzTabActive = true;
        $('#tab-sklady').classList.remove('active');
        $('#tab-pvz').classList.add('active');
        $('#tab-pvz').removeAttribute('data-action');
        $('#tab-sklady').dataset.wrong = 'true';
        buildPVZ();
    }

    function buildPVZ() {
        const list = $('#pvz-list');
        list.innerHTML = '';
        pvzList.forEach(p => {
            const r = document.createElement('div');
            r.className = 'pvz-r';
            r.textContent = p;
            if (p === CORRECT_PVZ) r.dataset.action = 'select-pvz';
            else r.dataset.wrong = 'true';
            list.appendChild(r);
        });
    }

    const pvzSearch = $('#pvz-search');
    if (pvzSearch) {
        pvzSearch.addEventListener('input', function () {
            const q = this.value.toLowerCase();
            $$('.pvz-r').forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
        });
    }

    // Scan
    function doScan() {
        show('s14b');
        const bar = $('#scan-bar');
        let pct = 0;
        const iv = setInterval(() => {
            pct += Math.random() * 15 + 5;
            if (pct >= 100) { pct = 100; clearInterval(iv); setTimeout(() => show('s15'), 500); }
            bar.style.width = pct + '%';
        }, 300);
    }

    // Loading checks
    function loadChecks() {
        ['ck1','ck2','ck3'].forEach((id, i) => {
            setTimeout(() => document.getElementById(id).classList.add('visible'), (i + 1) * 1000);
        });
        setTimeout(() => { $('#btn-go-main').style.display = 'flex'; }, 3500);
    }

    // Finish
    function doFinish() {
        if (state.timerMode) stopTimer();
        setTimeout(() => {
            $('#finish-overlay').classList.remove('hidden');
            confetti();
            if (state.timerMode) {
                $('#fin-time').style.display = 'block';
                $('#fin-val').textContent = fmt(state.timerElapsed);
                if (state.penalties > 0) { $('#fin-pen').textContent = `Штрафов: ${state.penalties} (+${state.penalties} сек)`; }
                save();
            }
        }, 1500);
    }

    function confetti() {
        const c = $('#confetti');
        const cols = ['#29B6F6','#7E57C2','#FFD700','#E53935','#4CAF50','#FF9800','#E91E63'];
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-p';
            p.style.left = Math.random() * 100 + '%';
            p.style.background = cols[Math.floor(Math.random() * cols.length)];
            p.style.animationDuration = (Math.random()*2+1.5)+'s';
            p.style.animationDelay = Math.random()*1+'s';
            p.style.width = (Math.random()*8+5)+'px';
            p.style.height = (Math.random()*8+5)+'px';
            p.style.transform = `rotate(${Math.random()*360}deg)`;
            c.appendChild(p);
        }
    }

    function save() {
        const ss = JSON.parse(localStorage.getItem('ibox_sessions') || '[]');
        ss.push({ time: state.timerElapsed, penalties: state.penalties, date: new Date().toISOString() });
        ss.sort((a,b) => a.time - b.time);
        if (ss.length > 20) ss.length = 20;
        localStorage.setItem('ibox_sessions', JSON.stringify(ss));
    }

    function loadLB() {
        const ss = JSON.parse(localStorage.getItem('ibox_sessions') || '[]');
        const list = $('#lb-list');
        list.innerHTML = '';
        if (!ss.length) { list.innerHTML = '<div class="lb-empty">Пока нет рекордов.<br>Пройдите симулятор с таймером!</div>'; return; }
        ss.forEach((s,i) => {
            const e = document.createElement('div');
            e.className = 'lb-entry';
            const rc = i===0?'gold':i===1?'silver':i===2?'bronze':'';
            e.innerHTML = `<span class="lb-rank ${rc}">#${i+1}</span><span class="lb-time">${fmt(s.time)}</span><span class="lb-pen">${s.penalties>0?'+'+s.penalties+'с':'—'}</span><span class="lb-date">${new Date(s.date).toLocaleDateString('ru-RU')}</span>`;
            list.appendChild(e);
        });
    }

    // Share
    $('#btn-tg').addEventListener('click', function() {
        const t = fmt(state.timerElapsed);
        const text = `🏆 Мой рекорд в симуляторе открытия смены: ${t}! Попробуй побить!`;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(text)}`, '_blank');
    });
    $('#btn-copy').addEventListener('click', function() {
        const t = fmt(state.timerElapsed);
        const text = `🏆 Мой рекорд: ${t}! ${location.href}`;
        navigator.clipboard.writeText(text).then(() => {
            this.innerHTML = '<span>✅</span> Скопировано!';
            setTimeout(() => { this.innerHTML = '<span>🔗</span> Скопировать ссылку'; }, 2000);
        });
    });
    $('#btn-restart').addEventListener('click', () => location.reload());

    // Start
    $('#btn-start-timer').addEventListener('click', function() {
        state.timerMode = true;
        begin();
        $('#timer-display').classList.remove('hidden');
        startTimer();
    });
    $('#btn-start-free').addEventListener('click', function() {
        state.timerMode = false;
        begin();
    });
    $('#btn-leaderboard').addEventListener('click', function() {
        loadLB();
        $('#leaderboard-overlay').classList.remove('hidden');
    });
    $('#lb-close').addEventListener('click', () => $('#leaderboard-overlay').classList.add('hidden'));
    $('#lb-clear').addEventListener('click', function() {
        if (confirm('Очистить все рекорды?')) { localStorage.removeItem('ibox_sessions'); loadLB(); }
    });

    function begin() {
        $('#start-menu').classList.add('hidden');
        $('#game-area').classList.remove('hidden');
    }

    function shuffle(a) { for (let i = a.length-1;i>0;i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

})();
