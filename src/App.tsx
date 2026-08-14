import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Palmtree, 
  Calendar, 
  Clock, 
  Sparkles, 
  Edit3, 
  Check, 
  Briefcase, 
  Volume2, 
  VolumeX, 
  Sun, 
  Sunset, 
  Waves, 
  PartyPopper,
  MessageCircle,
  Copy,
  Zap,
  Play,
  Timer
} from 'lucide-react';

interface TimeLeft {
  totalMs: number;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
  workDays: number;
  workHours: number;
  isFinished: boolean;
}

type ThemeMode = 'tropical' | 'sunset' | 'ocean' | 'festive';

export default function App() {
  // 1. Initial State from URL params or localStorage or Default
  const [targetDateStr, setTargetDateStr] = useState<string>('');
  const [eventTitle, setEventTitle] = useState<string>('Férias!');
  const [theme, setTheme] = useState<ThemeMode>('tropical');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasCelebrated, setHasCelebrated] = useState<boolean>(false);
  
  // Track speech spoken seconds to prevent duplicate spoken calls
  const lastSpokenSecRef = useRef<number | null>(null);

  // Form Inputs
  const [inputDate, setInputDate] = useState<string>('');
  const [inputTime, setInputTime] = useState<string>('18:00');
  const [inputTitle, setInputTitle] = useState<string>('Férias!');

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Beep sound generator for 5, 4, 3, 2, 1 countdown
  const playBeep = useCallback((freq = 880, duration = 0.15) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context restricted by browser
    }
  }, [soundEnabled]);

  // Voice synthesis countdown out loud: "5", "4", "3", "2", "1"
  const speakCount = useCallback((text: string) => {
    if (!soundEnabled) return;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // cancel previous utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-PT';
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Speech synthesis fallback
      }
    }
  }, [soundEnabled]);

  // Web Audio synth fanfare for finish state
  const playFanfare = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
      });
    } catch {
      // Audio context policy blocked
    }
  }, [soundEnabled]);

  // Fire confetti
  const triggerConfetti = useCallback(() => {
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 60,
        origin: { x: 0 },
        colors: ['#00f2fe', '#ff007f', '#ffe066', '#4facfe']
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 60,
        origin: { x: 1 },
        colors: ['#00f2fe', '#ff007f', '#ffe066', '#4facfe']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  // Parse URL search parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTarget = params.get('target') || params.get('datetime');
    const urlDate = params.get('date');
    const urlTime = params.get('time') || '18:00';
    const urlTitle = params.get('title') || params.get('name');
    const urlTheme = params.get('theme') as ThemeMode | null;

    if (urlTheme && ['tropical', 'sunset', 'ocean', 'festive'].includes(urlTheme)) {
      setTheme(urlTheme);
    }

    let finalTargetISO = '';

    if (urlTarget) {
      const parsed = new Date(urlTarget);
      if (!isNaN(parsed.getTime())) {
        finalTargetISO = parsed.toISOString();
      }
    } else if (urlDate) {
      const combined = `${urlDate}T${urlTime}`;
      const parsed = new Date(combined);
      if (!isNaN(parsed.getTime())) {
        finalTargetISO = parsed.toISOString();
      }
    }

    if (finalTargetISO) {
      setTargetDateStr(finalTargetISO);
      if (urlTitle) setEventTitle(urlTitle);
      setIsEditing(false);
    } else {
      const savedTarget = localStorage.getItem('vacation_target_date');
      const savedTitle = localStorage.getItem('vacation_event_title');
      const savedTheme = localStorage.getItem('vacation_theme') as ThemeMode | null;

      if (savedTheme) setTheme(savedTheme);

      if (savedTarget) {
        const parsed = new Date(savedTarget);
        if (!isNaN(parsed.getTime())) {
          setTargetDateStr(savedTarget);
          if (savedTitle) setEventTitle(savedTitle);
          setIsEditing(false);
          return;
        }
      }

      setIsEditing(true);
      const nextFri = getNextFriday();
      setInputDate(formatDateForInput(nextFri));
      setInputTime('18:00');
      setInputTitle('Férias!');
    }
  }, []);

  // Update root html attribute for theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vacation_theme', theme);
  }, [theme]);

  // Utility to get next Friday 18:00
  function getNextFriday(): Date {
    const d = new Date();
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(18, 0, 0, 0);
    return d;
  }

  function formatDateForInput(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Real-time ticker state
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculation of Time Left & Work Days
  const timeLeft: TimeLeft = useMemo(() => {
    if (!targetDateStr) {
      return { totalMs: 0, totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0, workDays: 0, workHours: 0, isFinished: false };
    }

    const targetDate = new Date(targetDateStr);
    const diffMs = targetDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { totalMs: 0, totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0, workDays: 0, workHours: 0, isFinished: true };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const totalHours = Math.floor(totalSeconds / 3600);

    let workDaysCount = 0;
    const cur = new Date(now);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(0, 0, 0, 0);

    while (cur < end) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDaysCount++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    const workHours = workDaysCount * 8;

    return {
      totalMs: diffMs,
      totalSeconds,
      days,
      hours,
      minutes,
      seconds,
      totalHours,
      workDays: workDaysCount,
      workHours,
      isFinished: false
    };
  }, [targetDateStr, now]);

  // 5-Second Voice & Audio Countdown (5, 4, 3, 2, 1)
  useEffect(() => {
    if (!targetDateStr || timeLeft.isFinished || isEditing) return;

    // Check if in the final 5 seconds (5, 4, 3, 2, 1)
    if (timeLeft.totalSeconds > 0 && timeLeft.totalSeconds <= 5) {
      const sec = timeLeft.totalSeconds;
      if (lastSpokenSecRef.current !== sec) {
        lastSpokenSecRef.current = sec;
        speakCount(String(sec));
        playBeep(sec === 1 ? 1200 : 800, 0.2);
      }
    }
  }, [timeLeft.totalSeconds, targetDateStr, timeLeft.isFinished, isEditing, speakCount, playBeep]);

  // Trigger celebration on reaching zero
  useEffect(() => {
    if (timeLeft.isFinished && targetDateStr && !hasCelebrated && !isEditing) {
      setHasCelebrated(true);
      speakCount('Boas Férias!');
      triggerConfetti();
      playFanfare();
    }
  }, [timeLeft.isFinished, targetDateStr, hasCelebrated, isEditing, triggerConfetti, playFanfare, speakCount]);

  // Test 5-Second Countdown Helper
  const handleTest5SecondCountdown = () => {
    const target = new Date(Date.now() + 6000); // 6 seconds from now
    const isoStr = target.toISOString();

    setTargetDateStr(isoStr);
    setEventTitle('Férias de Teste 🎉');
    setHasCelebrated(false);
    setIsEditing(false);
    lastSpokenSecRef.current = null;
    showToast('Iniciando contagem de teste de 5 segundos! ⏱️');
  };

  // Handle Form Submit
  const handleSaveCountdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDate) return;

    const combinedStr = `${inputDate}T${inputTime || '00:00'}`;
    const target = new Date(combinedStr);

    if (isNaN(target.getTime())) {
      showToast('Por favor escolha uma data e hora válidas.');
      return;
    }

    const isoStr = target.toISOString();
    const finalTitle = inputTitle.trim() || 'Férias!';

    setTargetDateStr(isoStr);
    setEventTitle(finalTitle);
    setHasCelebrated(false);
    setIsEditing(false);
    lastSpokenSecRef.current = null;

    localStorage.setItem('vacation_target_date', isoStr);
    localStorage.setItem('vacation_event_title', finalTitle);

    const url = new URL(window.location.href);
    url.searchParams.set('target', `${inputDate}T${inputTime}`);
    url.searchParams.set('title', finalTitle);
    url.searchParams.set('theme', theme);
    window.history.pushState({}, '', url.toString());

    showToast('Contagem criada com sucesso! 🚀');
  };

  // Quick Preset Helper
  const applyPreset = (daysAdd: number, hoursVal = 18) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAdd);
    setInputDate(formatDateForInput(d));
    setInputTime(`${String(hoursVal).padStart(2, '0')}:00`);
  };

  const applyNextFriday = () => {
    const fri = getNextFriday();
    setInputDate(formatDateForInput(fri));
    setInputTime('18:00');
  };

  const applySummer2026 = () => {
    setInputDate('2026-06-21');
    setInputTime('18:00');
    setInputTitle('Verão & Férias! ☀️');
  };

  // Copy shareable link
  const handleCopyLink = () => {
    if (!targetDateStr) return;
    const targetObj = new Date(targetDateStr);
    const localDate = formatDateForInput(targetObj);
    const hours = String(targetObj.getHours()).padStart(2, '0');
    const minutes = String(targetObj.getMinutes()).padStart(2, '0');
    const localTime = `${hours}:${minutes}`;

    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('target', `${localDate}T${localTime}`);
    url.searchParams.set('title', eventTitle);
    url.searchParams.set('theme', theme);

    navigator.clipboard.writeText(url.toString())
      .then(() => showToast('Link copiado! Pode enviar aos seus amigos 🔗'))
      .catch(() => showToast('Erro ao copiar link'));
  };

  // Share WhatsApp
  const handleShareWhatsApp = () => {
    if (!targetDateStr) return;
    const targetObj = new Date(targetDateStr);
    const localDate = formatDateForInput(targetObj);
    const hours = String(targetObj.getHours()).padStart(2, '0');
    const minutes = String(targetObj.getMinutes()).padStart(2, '0');

    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('target', `${localDate}T${hours}:${minutes}`);
    url.searchParams.set('title', eventTitle);
    url.searchParams.set('theme', theme);

    const text = encodeURIComponent(`🏖️ Olha quanto tempo falta para ${eventTitle}: ${url.toString()}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Formatting date display in Portuguese
  const formattedTargetDate = useMemo(() => {
    if (!targetDateStr) return '';
    const d = new Date(targetDateStr);
    return new Intl.DateTimeFormat('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }, [targetDateStr]);

  // Check if 5-second fullscreen overlay active
  const is5SecondOverlay = !isEditing && !timeLeft.isFinished && timeLeft.totalSeconds > 0 && timeLeft.totalSeconds <= 5;

  return (
    <>
      {/* 5-Second Countdown Fullscreen Overlay (Ano Novo style 5, 4, 3, 2, 1) */}
      {is5SecondOverlay && (
        <div className="countdown-overlay">
          <div className="countdown-overlay-number">{timeLeft.totalSeconds}</div>
          <div className="countdown-overlay-text">Prepara-te... As Férias Estão a Chegar! 🎉</div>
        </div>
      )}

      {/* Background Orbs */}
      <div className="bg-decorations">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="app-container">
        {/* Navigation Bar */}
        <header className="top-nav">
          <div className="brand-logo">
            <span className="brand-icon">🏖️</span>
            <span>Férias Countdown</span>
          </div>

          <div className="header-actions">
            {/* Theme switcher */}
            <div className="theme-pill-group">
              <button 
                type="button" 
                className={`theme-btn ${theme === 'tropical' ? 'active' : ''}`}
                onClick={() => setTheme('tropical')}
                title="Tema Praia Tropical 🌴"
              >
                <Sun size={16} />
              </button>
              <button 
                type="button" 
                className={`theme-btn ${theme === 'sunset' ? 'active' : ''}`}
                onClick={() => setTheme('sunset')}
                title="Tema Pôr do Sol 🌅"
              >
                <Sunset size={16} />
              </button>
              <button 
                type="button" 
                className={`theme-btn ${theme === 'ocean' ? 'active' : ''}`}
                onClick={() => setTheme('ocean')}
                title="Tema Azul Oceano 🌊"
              >
                <Waves size={16} />
              </button>
              <button 
                type="button" 
                className={`theme-btn ${theme === 'festive' ? 'active' : ''}`}
                onClick={() => setTheme('festive')}
                title="Tema Neón Festivo ⚡"
              >
                <PartyPopper size={16} />
              </button>
            </div>

            {/* Sound toggle */}
            <button
              type="button"
              className="theme-btn active"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Som e Voz ativados' : 'Som e Voz desativados'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </header>

        {/* Main Card View */}
        <main className="glass-card">
          {isEditing ? (
            /* Setup Form Screen */
            <form onSubmit={handleSaveCountdown}>
              <div className="form-header">
                <h1>Quanto falta para as férias? 🌴</h1>
                <p>Escolha a data e a hora para iniciar a contagem decrescente em tempo real.</p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="event-title">Nome do Evento / Destino</label>
                <input
                  id="event-title"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Férias no Algarve, Viagem a Itália, Férias de Verão"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                />
              </div>

              <div className="date-time-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="event-date">Data das Férias</label>
                  <input
                    id="event-date"
                    type="date"
                    className="form-input"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="event-time">Hora de Início</label>
                  <input
                    id="event-time"
                    type="time"
                    className="form-input"
                    value={inputTime}
                    onChange={(e) => setInputTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="presets-container">
                <div className="presets-title">Atalhos Rápidos:</div>
                <div className="presets-grid">
                  <button type="button" className="preset-chip" onClick={() => applyPreset(1, 18)}>
                    <Clock size={14} /> Amanhã 18h
                  </button>
                  <button type="button" className="preset-chip" onClick={applyNextFriday}>
                    <Calendar size={14} /> Próxima Sexta 18h
                  </button>
                  <button type="button" className="preset-chip" onClick={() => applyPreset(7, 18)}>
                    <Zap size={14} /> Daqui a 1 Semana
                  </button>
                  <button type="button" className="preset-chip" onClick={() => applyPreset(30, 18)}>
                    <Palmtree size={14} /> Daqui a 1 Mês
                  </button>
                  <button type="button" className="preset-chip" onClick={applySummer2026}>
                    <Sun size={14} /> Verão 2026 (21 Jun)
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-submit">
                <Sparkles size={20} /> Iniciar Contagem Decrescente
              </button>

              <button 
                type="button" 
                className="btn-secondary" 
                style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
                onClick={handleTest5SecondCountdown}
              >
                <Timer size={18} /> 🧪 Testar Contagem de 5 Segundos + Música
              </button>

              {targetDateStr && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
                  onClick={() => setIsEditing(false)}
                >
                  Voltar à Contagem Atual
                </button>
              )}
            </form>
          ) : timeLeft.isFinished ? (
            /* Celebration Screen when Time Reached */
            <div className="finished-container">
              <div className="celebration-emoji">✈️🥳🍹🎉</div>
              <h1 className="finished-title">AS FÉRIAS CHEGARAM!</h1>
              <p className="finished-text">
                Parabéns! O tempo de trabalho acabou. É hora de relaxar e celebrar <b>{eventTitle}</b>!
              </p>

              {/* YouTube Celebration Music Embed */}
              <div className="youtube-player-container">
                <iframe
                  src="https://www.youtube.com/embed/i2PzdZ61HD4?autoplay=1&enablejsapi=1"
                  title="Kool & The Gang - Celebration"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="countdown-actions">
                <button type="button" className="btn-accent" onClick={triggerConfetti}>
                  <PartyPopper size={18} /> Mais Confetis!
                </button>
                <a 
                  href="https://www.youtube.com/watch?v=i2PzdZ61HD4" 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  <Play size={18} /> Abrir Música no YouTube 🎵
                </a>
                <button type="button" className="btn-secondary" onClick={() => setIsEditing(true)}>
                  <Edit3 size={18} /> Nova Contagem
                </button>
              </div>
            </div>
          ) : (
            /* Active Live Countdown Screen */
            <div>
              <div className="countdown-header">
                <div className="vacation-badge">
                  <Palmtree size={15} /> Contagem Decrescente
                </div>
                <h1 className="vacation-title">{eventTitle}</h1>
                <p className="target-date-subtitle">
                  Início: <strong style={{ color: '#fff' }}>{formattedTargetDate}</strong>
                </p>
              </div>

              {/* Number Grid */}
              <div className="counter-grid">
                <div className="counter-box">
                  <div className="counter-value">{String(timeLeft.days).padStart(2, '0')}</div>
                  <div className="counter-label">{timeLeft.days === 1 ? 'Dia' : 'Dias'}</div>
                </div>

                <div className="counter-box">
                  <div className="counter-value">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="counter-label">{timeLeft.hours === 1 ? 'Hora' : 'Horas'}</div>
                </div>

                <div className="counter-box">
                  <div className="counter-value">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div className="counter-label">{timeLeft.minutes === 1 ? 'Minuto' : 'Minutos'}</div>
                </div>

                <div className="counter-box">
                  <div className="counter-value">{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div className="counter-label">{timeLeft.seconds === 1 ? 'Segundo' : 'Segundos'}</div>
                </div>
              </div>

              {/* Extra Productivity & Time Breakdown */}
              <div className="details-bar">
                <div className="detail-item">
                  <div className="detail-icon">
                    <Briefcase size={20} />
                  </div>
                  <div className="detail-info">
                    <div className="detail-value">{timeLeft.workDays} Dias Úteis</div>
                    <div className="detail-desc">Dias de trabalho restantes</div>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon">
                    <Clock size={20} />
                  </div>
                  <div className="detail-info">
                    <div className="detail-value">{timeLeft.workHours} Horas</div>
                    <div className="detail-desc">Horas aprox. de escritório (8h/dia)</div>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-icon">
                    <Sparkles size={20} />
                  </div>
                  <div className="detail-info">
                    <div className="detail-value">{timeLeft.totalHours.toLocaleString('pt-PT')} Horas Totais</div>
                    <div className="detail-desc">Tempo total continuo restante</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="countdown-actions">
                <button type="button" className="btn-accent" onClick={handleCopyLink}>
                  <Copy size={18} /> Copiar Link com Parâmetros
                </button>
                <button type="button" className="btn-secondary" onClick={handleShareWhatsApp}>
                  <MessageCircle size={18} /> Partilhar no WhatsApp
                </button>
                <button type="button" className="btn-secondary" onClick={handleTest5SecondCountdown}>
                  <Timer size={18} /> Testar 5s + Música 🎵
                </button>
                <button type="button" className="btn-secondary" onClick={() => setIsEditing(true)}>
                  <Edit3 size={18} /> Alterar Data / Título
                </button>
              </div>
            </div>
          )}
        </main>

        <footer className="footer-text">
          <p>
            Dica: Pode passar parâmetros no URL como <code>?target=2026-08-20T18:00&title=Algarve</code> para abrir a contagem diretamente!
          </p>
        </footer>
      </div>

      {/* Toast popup */}
      <div className={`toast-notification ${toastMessage ? 'visible' : ''}`}>
        <Check size={18} style={{ color: '#00f2fe' }} />
        <span>{toastMessage}</span>
      </div>
    </>
  );
}
