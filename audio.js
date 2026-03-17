// Procedural Naval Ambient Soundscape using Web Audio API

const AudioEngine = (() => {
    let ctx = null;
    let masterGain = null;
    let isPlaying = false;
    let isMuted = false;
    let nodes = [];

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.35;
        masterGain.connect(ctx.destination);
    }

    // --- Ocean Waves (filtered noise with LFO) ---
    function createOceanWaves() {
        const bufferSize = ctx.sampleRate * 4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 1.0;

        // LFO to modulate the filter for wave-like swells
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08; // slow swell
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        // Volume LFO for wave surge
        const volLfo = ctx.createOscillator();
        volLfo.type = 'sine';
        volLfo.frequency.value = 0.06;
        const volLfoGain = ctx.createGain();
        volLfoGain.gain.value = 0.15;

        const waveGain = ctx.createGain();
        waveGain.gain.value = 0.3;
        volLfo.connect(volLfoGain);
        volLfoGain.connect(waveGain.gain);

        noise.connect(filter);
        filter.connect(waveGain);
        waveGain.connect(masterGain);

        noise.start();
        lfo.start();
        volLfo.start();
        nodes.push(noise, lfo, volLfo);
    }

    // --- Deep Submarine Hum ---
    function createSubHum() {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 55; // deep low hum

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 82.5; // subtle fifth

        const humGain = ctx.createGain();
        humGain.gain.value = 0.06;

        const humGain2 = ctx.createGain();
        humGain2.gain.value = 0.03;

        // Slow tremolo
        const tremolo = ctx.createOscillator();
        tremolo.type = 'sine';
        tremolo.frequency.value = 0.3;
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = 0.02;
        tremolo.connect(tremoloGain);
        tremoloGain.connect(humGain.gain);

        osc.connect(humGain);
        osc2.connect(humGain2);
        humGain.connect(masterGain);
        humGain2.connect(masterGain);

        osc.start();
        osc2.start();
        tremolo.start();
        nodes.push(osc, osc2, tremolo);
    }

    // --- Sonar Ping (repeating) ---
    function scheduleSonarPing() {
        if (!isPlaying) return;

        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1480, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

        const pingGain = ctx.createGain();
        pingGain.gain.setValueAtTime(0, now);
        pingGain.gain.linearRampToValueAtTime(0.08, now + 0.01);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        // Reverb-like tail using delay
        const delay = ctx.createDelay();
        delay.delayTime.value = 0.3;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.25;
        const delayGain = ctx.createGain();
        delayGain.gain.value = 0.04;

        osc.connect(pingGain);
        pingGain.connect(masterGain);
        pingGain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 2);

        // Schedule next ping with some randomness (6-12 seconds)
        const nextDelay = 6000 + Math.random() * 6000;
        setTimeout(() => scheduleSonarPing(), nextDelay);
    }

    // --- Distant Metal Creak (occasional) ---
    function scheduleCreak() {
        if (!isPlaying) return;

        const now = ctx.currentTime;
        const freq = 200 + Math.random() * 150;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.7, now + 0.4);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        filter.Q.value = 8;

        const creakGain = ctx.createGain();
        creakGain.gain.setValueAtTime(0, now);
        creakGain.gain.linearRampToValueAtTime(0.015, now + 0.05);
        creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(filter);
        filter.connect(creakGain);
        creakGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.6);

        // Next creak in 10-25 seconds
        const nextDelay = 10000 + Math.random() * 15000;
        setTimeout(() => scheduleCreak(), nextDelay);
    }

    // Utility: create a distortion curve for WaveShaperNode
    function makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) /
                       (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    // --- SFX: Hit — Fiery Explosion with Crackle & Shrapnel ---
    function playHit() {
        if (!ctx || isMuted) return;
        const now = ctx.currentTime;

        // Layer 1: Distorted noise burst (crackle/shrapnel)
        const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;

        const distortion = ctx.createWaveShaper();
        distortion.curve = makeDistortionCurve(150);
        distortion.oversample = '4x';

        const noiseBp = ctx.createBiquadFilter();
        noiseBp.type = 'bandpass';
        noiseBp.frequency.value = 800;
        noiseBp.Q.value = 0.8;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        noise.connect(distortion);
        distortion.connect(noiseBp);
        noiseBp.connect(noiseGain);
        noiseGain.connect(masterGain);

        // Layer 2: Fire sizzle (mid-freq noise)
        const fireBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
        const fd = fireBuf.getChannelData(0);
        for (let i = 0; i < fd.length; i++) fd[i] = Math.random() * 2 - 1;
        const fire = ctx.createBufferSource();
        fire.buffer = fireBuf;

        const fireBp = ctx.createBiquadFilter();
        fireBp.type = 'bandpass';
        fireBp.frequency.value = 1200;
        fireBp.Q.value = 2;

        const fireGain = ctx.createGain();
        fireGain.gain.setValueAtTime(0.2, now + 0.03);
        fireGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        fire.connect(fireBp);
        fireBp.connect(fireGain);
        fireGain.connect(masterGain);

        // Layer 3: Deep thud sweep
        const thud = ctx.createOscillator();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(80, now);
        thud.frequency.exponentialRampToValueAtTime(20, now + 0.3);

        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.4, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        thud.connect(thudGain);
        thudGain.connect(masterGain);

        noise.start(now);
        noise.stop(now + 0.5);
        fire.start(now + 0.03);
        fire.stop(now + 0.5);
        thud.start(now);
        thud.stop(now + 0.4);
    }

    // --- SFX: Miss — Gentle Water Plop/Splash ---
    function playMiss() {
        if (!ctx || isMuted) return;
        const now = ctx.currentTime;

        // Layer 1: Quick high-frequency splash "tsk"
        const splashBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
        const sd = splashBuf.getChannelData(0);
        for (let i = 0; i < sd.length; i++) sd[i] = Math.random() * 2 - 1;
        const splash = ctx.createBufferSource();
        splash.buffer = splashBuf;

        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1500;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(5000, now);
        lp.frequency.exponentialRampToValueAtTime(800, now + 0.12);

        const splashGain = ctx.createGain();
        splashGain.gain.setValueAtTime(0.1, now);
        splashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        splash.connect(hp);
        hp.connect(lp);
        lp.connect(splashGain);
        splashGain.connect(masterGain);

        // Layer 2: Low sine "plop"
        const plop = ctx.createOscillator();
        plop.type = 'sine';
        plop.frequency.setValueAtTime(300, now);
        plop.frequency.exponentialRampToValueAtTime(150, now + 0.06);

        const plopGain = ctx.createGain();
        plopGain.gain.setValueAtTime(0.08, now);
        plopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        plop.connect(plopGain);
        plopGain.connect(masterGain);

        splash.start(now);
        splash.stop(now + 0.15);
        plop.start(now);
        plop.stop(now + 0.1);
    }

    // --- SFX: Ship Sunk — Massive Cinematic Double-Boom ---
    function playSunk() {
        if (!ctx || isMuted) return;
        const now = ctx.currentTime;

        // Layer 1: Initial sharp crack (distorted high-freq noise)
        const crackBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
        const cd = crackBuf.getChannelData(0);
        for (let i = 0; i < cd.length; i++) cd[i] = Math.random() * 2 - 1;
        const crack = ctx.createBufferSource();
        crack.buffer = crackBuf;

        const crackDist = ctx.createWaveShaper();
        crackDist.curve = makeDistortionCurve(200);
        crackDist.oversample = '4x';

        const crackHp = ctx.createBiquadFilter();
        crackHp.type = 'highpass';
        crackHp.frequency.value = 600;

        const crackGain = ctx.createGain();
        crackGain.gain.setValueAtTime(0.45, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        crack.connect(crackDist);
        crackDist.connect(crackHp);
        crackHp.connect(crackGain);
        crackGain.connect(masterGain);

        // Layer 2: Main explosion body (filtered noise, long decay)
        const mainBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
        const md = mainBuf.getChannelData(0);
        for (let i = 0; i < md.length; i++) md[i] = Math.random() * 2 - 1;
        const main = ctx.createBufferSource();
        main.buffer = mainBuf;

        const mainDist = ctx.createWaveShaper();
        mainDist.curve = makeDistortionCurve(100);
        mainDist.oversample = '2x';

        const mainLp = ctx.createBiquadFilter();
        mainLp.type = 'lowpass';
        mainLp.frequency.setValueAtTime(2000, now);
        mainLp.frequency.exponentialRampToValueAtTime(60, now + 1.4);

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(0.35, now);
        mainGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        main.connect(mainDist);
        mainDist.connect(mainLp);
        mainLp.connect(mainGain);
        mainGain.connect(masterGain);

        // Layer 3: Deep sub-bass rumble sweep
        const rumble = ctx.createOscillator();
        rumble.type = 'sine';
        rumble.frequency.setValueAtTime(40, now);
        rumble.frequency.exponentialRampToValueAtTime(15, now + 1.2);

        const rumbleGain = ctx.createGain();
        rumbleGain.gain.setValueAtTime(0.45, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        rumble.connect(rumbleGain);
        rumbleGain.connect(masterGain);

        // Layer 4: Delayed secondary boom (+0.15s)
        const boom2Buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
        const b2d = boom2Buf.getChannelData(0);
        for (let i = 0; i < b2d.length; i++) b2d[i] = Math.random() * 2 - 1;
        const boom2 = ctx.createBufferSource();
        boom2.buffer = boom2Buf;

        const boom2Lp = ctx.createBiquadFilter();
        boom2Lp.type = 'lowpass';
        boom2Lp.frequency.setValueAtTime(800, now + 0.15);
        boom2Lp.frequency.exponentialRampToValueAtTime(40, now + 0.8);

        const boom2Gain = ctx.createGain();
        boom2Gain.gain.setValueAtTime(0, now);
        boom2Gain.gain.linearRampToValueAtTime(0.35, now + 0.16);
        boom2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        const boom2Thud = ctx.createOscillator();
        boom2Thud.type = 'triangle';
        boom2Thud.frequency.setValueAtTime(50, now + 0.15);
        boom2Thud.frequency.exponentialRampToValueAtTime(18, now + 0.7);

        const boom2ThudGain = ctx.createGain();
        boom2ThudGain.gain.setValueAtTime(0, now);
        boom2ThudGain.gain.linearRampToValueAtTime(0.3, now + 0.16);
        boom2ThudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        boom2.connect(boom2Lp);
        boom2Lp.connect(boom2Gain);
        boom2Gain.connect(masterGain);
        boom2Thud.connect(boom2ThudGain);
        boom2ThudGain.connect(masterGain);

        // Start all layers
        crack.start(now);
        crack.stop(now + 0.15);
        main.start(now);
        main.stop(now + 1.5);
        rumble.start(now);
        rumble.stop(now + 1.3);
        boom2.start(now + 0.15);
        boom2.stop(now + 0.9);
        boom2Thud.start(now + 0.15);
        boom2Thud.stop(now + 0.8);
    }

    // --- SFX: Battle Horn (game start) ---
    function playBattleHorn() {
        if (!ctx || isMuted) return;
        const now = ctx.currentTime;

        function horn(freq, start, dur) {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + start);

            const flt = ctx.createBiquadFilter();
            flt.type = 'lowpass';
            flt.frequency.value = 1200;
            flt.Q.value = 2;

            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + start);
            g.gain.linearRampToValueAtTime(0.1, now + start + 0.05);
            g.gain.setValueAtTime(0.1, now + start + dur - 0.1);
            g.gain.linearRampToValueAtTime(0, now + start + dur);

            osc.connect(flt);
            flt.connect(g);
            g.connect(masterGain);
            osc.start(now + start);
            osc.stop(now + start + dur);
        }

        horn(220, 0, 0.4);    // A3
        horn(277.18, 0, 0.4); // C#4 (major third)
        horn(293.66, 0.45, 0.55); // D4
        horn(349.23, 0.45, 0.55); // F4
    }

    // --- SFX: Victory Fanfare ---
    function playVictory() {
        if (!ctx || isMuted) return;
        const now = ctx.currentTime;

        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;

            const g = ctx.createGain();
            const t = i * 0.15;
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.12, now + t + 0.04);
            g.gain.setValueAtTime(0.12, now + t + 0.3);
            g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.8);

            osc.connect(g);
            g.connect(masterGain);
            osc.start(now + t);
            osc.stop(now + t + 0.8);
        });
    }

    // --- SFX: Defeat ---
    function playDefeat() {
        if (!ctx || isMuted) return;
        const now = ctx.currentTime;

        const notes = [392, 349.23, 293.66, 261.63]; // G4 F4 D4 C4 descending
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const g = ctx.createGain();
            const t = i * 0.25;
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.1, now + t + 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.7);

            osc.connect(g);
            g.connect(masterGain);
            osc.start(now + t);
            osc.stop(now + t + 0.7);
        });
    }

    // --- Public API ---
    function start() {
        init();
        if (ctx.state === 'suspended') ctx.resume();
        if (isPlaying) return;
        isPlaying = true;

        createOceanWaves();
        createSubHum();

        // Stagger the first ping and creak
        setTimeout(() => scheduleSonarPing(), 2000);
        setTimeout(() => scheduleCreak(), 8000);
    }

    function ensureContext() {
        init();
        if (ctx.state === 'suspended') ctx.resume();
    }

    function stop() {
        isPlaying = false;
        nodes.forEach(n => { try { n.stop(); } catch(e) {} });
        nodes = [];
        if (ctx) {
            ctx.close();
            ctx = null;
            masterGain = null;
        }
    }

    function toggleMute() {
        if (!ctx || !masterGain) return false;
        isMuted = !isMuted;
        masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.35, ctx.currentTime, 0.1);
        return isMuted;
    }

    function getIsMuted() {
        return isMuted;
    }

    return { start, stop, toggleMute, getIsMuted, ensureContext,
             playHit, playMiss, playSunk, playBattleHorn, playVictory, playDefeat };
})();
