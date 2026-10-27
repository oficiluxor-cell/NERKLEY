"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface PerfumeScene {
  id: string;
  name: string;
  brand: string;
  categoryType: "nicho" | "disenador" | "arabe";
  badge: string;
  notes: string;
  highlight: string;
  price: string;
  oldPrice?: string;
  image: string;
}

const FULL_CATALOG_PERFUMES: PerfumeScene[] = [
  {
    id: "bond-no9",
    name: "BOND NO 9 DOWNTOWN LAFAYETTE",
    brand: "BOND NO 9 NEW YORK",
    categoryType: "nicho",
    badge: "👑 ALTO NICHO • EL SANTO GRIAL",
    notes: "Manzana dulce • Bergamota • Maderas ambarinas",
    highlight: "El perfume más exclusivo y deseado de Nueva York",
    price: "$1.450.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/lafayettestreet.jpg?v=1777137836&width=3000",
  },
  {
    id: "parfums-marly-herod",
    name: "PARFUMS DE MARLY HEROD",
    brand: "PARFUMS DE MARLY PARIS",
    categoryType: "nicho",
    badge: "💎 ALTA REALEZA FRANCESA",
    notes: "Vainilla ahumada • Hoja de tabaco • Canela & Cedro",
    highlight: "Opulencia pura. Un aura de poder y riqueza inmediata",
    price: "$1.900.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/parfumsdemarlyherod.jpg?v=1777137905&width=3000",
  },
  {
    id: "montale-infinity",
    name: "MONTALE INFINITY",
    brand: "MONTALE PARIS",
    categoryType: "nicho",
    badge: "✨ ALTA PERFUMERÍA DE AUTOR",
    notes: "Cereza negra • Cuero noble • Oud refinado & Vainilla",
    highlight: "Estela infinita que se queda en la habitación por horas",
    price: "$508.500 COP",
    oldPrice: "$565.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/montaleinfinity.jpg?v=1777137785&width=3000",
  },
  {
    id: "jpg-elixir",
    name: "JEAN PAUL GAULTIER LE MALE ELIXIR",
    brand: "JEAN PAUL GAULTIER",
    categoryType: "disenador",
    badge: "🔥 SEDUCCIÓN EXTREMA",
    notes: "Miel dorada • Haba Tonka ardiente • Vainilla negra",
    highlight: "Fijación extrema de 14 horas. Imposible pasar desapercibido",
    price: "$580.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/jeanpaul_elixir.jpg?v=1777137263&width=3000",
  },
  {
    id: "lattafa-qahwa",
    name: "LATTAFA KHAMRAH QAHWA",
    brand: "LATTAFA PRIDE",
    categoryType: "arabe",
    badge: "☕ EL FENÓMENO VIRAL MUNDIAL",
    notes: "Café árabe tostado • Canela especiada • Praliné licoroso",
    highlight: "Aroma gourmand adictivo con proyección atronadora",
    price: "$320.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/perfume_lattafakhamrahqawha.jpg?v=1777137266&width=3000",
  },
  {
    id: "afnan-9pm",
    name: "AFNAN 9 PM NIGHT OUT",
    brand: "AFNAN PERFUMES",
    categoryType: "arabe",
    badge: "⚡ LA BESTIA DE LA NOCHE",
    notes: "Manzana silvestre • Canela negra • Vainilla Bourbon",
    highlight: "La bestia de las fiestas y salidas nocturnas",
    price: "$358.200 COP",
    oldPrice: "$398.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/9pmnightout.jpg?v=1777136784&width=3000",
  },
  {
    id: "versace-flame",
    name: "VERSACE EROS FLAME",
    brand: "VERSACE",
    categoryType: "disenador",
    badge: "👑 POTENCIA & PASIÓN",
    notes: "Mandarina italiana • Pimienta negra de Madagascar • Maderas",
    highlight: "Presencia imponente y masculina desde el primer spray",
    price: "$450.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/Disenosintitulo_e1f57ce3-3ee4-453f-a645-f09ea17d3b3c.jpg?v=1777136697&width=3000",
  },
  {
    id: "dior-homme-2020",
    name: "DIOR HOMME 2020",
    brand: "DIOR PARIS",
    categoryType: "disenador",
    badge: "💼 ELEGANCIA ARQUITECTÓNICA",
    notes: "Cedro del Atlas • Vetiver de Haití • Madera de Cachemira",
    highlight: "La definición exacta de masculinidad moderna de alto estatus",
    price: "$630.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/diorhomme2020_6041ff13-44fc-4bf4-a8c4-aacbebe91752.jpg?v=1791133518&width=3000",
  },
  {
    id: "club-de-nuit",
    name: "ARMAF CLUB DE NUIT INTENSE",
    brand: "ARMAF",
    categoryType: "arabe",
    badge: "🖤 EL REY INVICTO",
    notes: "Limón ahumado • Grosellas negras • Abedul & Almizcle",
    highlight: "El aroma que proyecta seguridad, poder y magnetismo",
    price: "$310.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/intenseman.jpg?v=1785374592&width=3000",
  },
];

const VIRAL_HOOKS = [
  {
    id: "reverse",
    title: "Psicología Inversa (Viral en TikTok)",
    line1: "NO USES NINGUNO",
    line2: "DE ESTOS PERFUMES",
    subtitle: "A menos que quieras que todos te pregunten a qué hueles.",
    warning: "⚠️ ADVERTENCIA: PROYECCIÓN EXTREMA",
  },
  {
    id: "wealth",
    title: "Estatus & Lujo Millonario",
    line1: "HUELEN A MILLONES",
    line2: "SIN COSTAR MILLONES",
    subtitle: "Las fragancias de alta gama más adictivas del año.",
    warning: "💎 100% ORIGINALES • BATCH CODE VERIFICADO",
  },
  {
    id: "beast",
    title: "Fijación Bestial 14+ Horas",
    line1: "FRAGANCIAS QUE DURAN",
    line2: "MÁS DE 14 HORAS",
    subtitle: "Entras a un lugar y el aroma se queda cuando te vas.",
    warning: "🔥 MÁXIMA CONCENTRACIÓN PARFUM",
  },
];

export default function VideoAdStudioPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedPerfumes, setSelectedPerfumes] = useState<PerfumeScene[]>([
    FULL_CATALOG_PERFUMES[0], // Bond No 9
    FULL_CATALOG_PERFUMES[1], // Parfums de Marly
    FULL_CATALOG_PERFUMES[3], // JPG Elixir
    FULL_CATALOG_PERFUMES[4], // Lattafa Qahwa
  ]);
  const [activeHook, setActiveHook] = useState(VIRAL_HOOKS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Listo para generar");
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [imagesLoading, setImagesLoading] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);

  const animationFrameId = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Tiempos cinematográficos
  const HOOK_DURATION = 3.2; // Impacto inicial
  const PERFUME_DURATION = 3.8; // Tiempo por perfume
  const CTA_DURATION = 3.5; // Cierre

  const totalDuration = HOOK_DURATION + selectedPerfumes.length * PERFUME_DURATION + CTA_DURATION;

  // Carga de imágenes con proxy seguro anti-CORS
  useEffect(() => {
    let isMounted = true;
    setImagesLoading(true);

    const loadImages = async () => {
      const map: { [key: string]: HTMLImageElement } = {};
      const promises = selectedPerfumes.map((p) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = `/api/proxy-image?url=${encodeURIComponent(p.image)}`;
          img.onload = () => {
            map[p.id] = img;
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
        });
      });

      await Promise.all(promises);
      if (isMounted) {
        setLoadedImages(map);
        setImagesLoading(false);
        renderCinematicFrame(0);
      }
    };

    loadImages();
    return () => {
      isMounted = false;
    };
  }, [selectedPerfumes]);

  // Motor de Audio Cinematográfico (Sub-Bass drops, Whooshes y Beat de Lujo)
  const setupAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      return dest;
    } catch {
      return null;
    }
  };

  const playCinematicSoundAt = (ctx: AudioContext, dest: MediaStreamAudioDestinationNode, time: number) => {
    if (!soundEffectsEnabled) return;

    // 1. IMPACTO SUB-BASS BOOM en transiciones de escena (al segundo 0, 3.2, 7.0, etc.)
    const isTransition =
      Math.abs(time - 0.05) < 0.04 ||
      Math.abs(time - HOOK_DURATION) < 0.04 ||
      selectedPerfumes.some((_, idx) => Math.abs(time - (HOOK_DURATION + idx * PERFUME_DURATION)) < 0.04);

    if (isTransition) {
      // Sub-Bass 808 cinematográfico profundo
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(dest);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);

      // Whoosh de aire / viento cinematográfico
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.25);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);
      noiseGain.connect(ctx.destination);
      whiteNoise.start();
      whiteNoise.stop(ctx.currentTime + 0.3);
    }

    // 2. Beat Rítmico Continuo de Lujo (124 BPM)
    const bpm = 124;
    const beatInterval = 60 / bpm;
    const beatNum = Math.floor(time / beatInterval);

    if (time > 0.5 && beatNum % 2 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(dest);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  };

  // MOTOR CINEMATOGRÁFICO DE RENDERIZADO (1080 x 1920)
  const renderCinematicFrame = (t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1080;
    const H = 1920;

    // --- 1. FONDO OBSIDIANA CINEMATOGRÁFICA & LUZ VOLUMÉTRICA ---
    const bgGrad = ctx.createRadialGradient(W / 2, 700, 100, W / 2, 800, 1100);
    bgGrad.addColorStop(0, "#191924");
    bgGrad.addColorStop(0.4, "#0c0c11");
    bgGrad.addColorStop(1, "#040406");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Haz de luz volumétrica dorada desde arriba
    ctx.save();
    const lightBeam = ctx.createLinearGradient(W / 2, 0, W / 2, 1200);
    lightBeam.addColorStop(0, "rgba(232, 198, 98, 0.15)");
    lightBeam.addColorStop(0.5, "rgba(232, 198, 98, 0.04)");
    lightBeam.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = lightBeam;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 200, 0);
    ctx.lineTo(W / 2 + 200, 0);
    ctx.lineTo(W / 2 + 500, 1200);
    ctx.lineTo(W / 2 - 500, 1200);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- 2. BRASAS & POLVO DE ORO FLOTANTE CON FÍSICA CINEMATOGRÁFICA ---
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 73.13;
      const speed = 40 + (i % 5) * 25;
      const px = ((seed * 19 + Math.sin(t * 1.5 + i) * 60) % W + W) % W;
      const py = ((H - ((t * speed + seed * 31) % H))) % H;
      const radius = (i % 3 === 0 ? 3.5 : 1.8) + Math.sin(t * 4 + i) * 0.8;
      const alpha = 0.25 + 0.45 * Math.sin(t * 2 + i);

      ctx.fillStyle = `rgba(232, 198, 98, ${Math.max(0, alpha)})`;
      ctx.shadowColor = "#E5C158";
      ctx.shadowBlur = radius * 4;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // --- 3. BARRA SUPERIOR DE RETENCIÓN DE TIKTOK ---
    const totalProg = Math.min(1, t / totalDuration);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(80, 80, W - 160, 12);

    const progGrad = ctx.createLinearGradient(80, 0, W - 80, 0);
    progGrad.addColorStop(0, "#D4AF37");
    progGrad.addColorStop(1, "#FFF2A1");
    ctx.fillStyle = progGrad;
    ctx.fillRect(80, 80, (W - 160) * totalProg, 12);

    // Identidad Superior Discreta de Lujo
    ctx.textAlign = "center";
    ctx.font = "bold 26px serif";
    ctx.letterSpacing = "6px";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("NERKLEY SHOWROOM", W / 2, 145);

    ctx.font = "700 16px sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillStyle = "#E5C158";
    ctx.fillText("HAUTE PARFUMERIE • COLOMBIA", W / 2, 175);

    // ========================================================
    // ESCENA 1: EL GANCHO VIRAL DE IMPACTO PSICOLÓGICO (0s - 3.2s)
    // ========================================================
    if (t < HOOK_DURATION) {
      const hookProgress = t / HOOK_DURATION;
      const zoom = 1 + hookProgress * 0.08;

      ctx.save();
      ctx.translate(W / 2, H / 2 - 50);
      ctx.scale(zoom, zoom);

      // Aura de impacto roja / dorada
      const aura = ctx.createRadialGradient(0, 0, 50, 0, 0, 480);
      aura.addColorStop(0, "rgba(239, 68, 68, 0.25)");
      aura.addColorStop(0.5, "rgba(232, 198, 98, 0.15)");
      aura.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 480, 0, Math.PI * 2);
      ctx.fill();

      // Alerta de Advertencia
      ctx.fillStyle = "#EF4444";
      ctx.beginPath();
      ctx.roundRect(-280, -320, 560, 64, 32);
      ctx.fill();

      ctx.font = "900 24px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(activeHook.warning, 0, -280);

      // TÍTULO HIPNÓTICO GIGANTE EN AMARILLO NEÓN & BLANCO
      ctx.font = "900 76px sans-serif";
      ctx.fillStyle = "#FFE600";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 18;
      ctx.fillText(activeHook.line1, 0, -180);

      ctx.font = "900 72px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(activeHook.line2, 0, -80);
      ctx.shadowBlur = 0;

      // Línea dorada separadora
      ctx.strokeStyle = "#E5C158";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-180, -20);
      ctx.lineTo(180, -20);
      ctx.stroke();

      // Subtítulo de Gancho
      ctx.font = "700 38px sans-serif";
      ctx.fillStyle = "#E4E4E7";
      const words = activeHook.subtitle.split(" ");
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(" "), 0, 60);
      ctx.fillText(words.slice(mid).join(" "), 0, 120);

      // Sello de Batch Code y Autenticidad
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-340, 210, 680, 84, 20);
      ctx.fill();
      ctx.stroke();

      ctx.font = "900 26px sans-serif";
      ctx.fillStyle = "#34D399";
      ctx.fillText("🔒 100% ORIGINALES • BATCH CODE VERIFICABLE", 0, 262);

      // Iconos de Impacto
      ctx.font = "50px sans-serif";
      ctx.fillText("🇨🇴  🚚  💎", 0, 370);

      ctx.restore();
      return;
    }

    // ========================================================
    // ESCENA 2: PERFUMES DE ALTO CALIBRE CON REVELACIÓN 3D
    // ========================================================
    const perfumeTime = t - HOOK_DURATION;
    const currentIndex = Math.floor(perfumeTime / PERFUME_DURATION);

    if (currentIndex >= 0 && currentIndex < selectedPerfumes.length) {
      const perfume = selectedPerfumes[currentIndex];
      const localTime = perfumeTime % PERFUME_DURATION;
      const localProg = localTime / PERFUME_DURATION;

      // Efecto Zoom Cinematográfico y Flotación
      const zoom = 1 + localProg * 0.09;
      const floatY = Math.sin(localTime * 2.5) * 8;

      ctx.save();
      ctx.translate(W / 2, 740 + floatY);
      ctx.scale(zoom, zoom);

      // Reflejo y Pedestal de Obsidiana con luz dorada
      const pedestalGrad = ctx.createRadialGradient(0, 360, 40, 0, 360, 420);
      pedestalGrad.addColorStop(0, "rgba(232, 198, 98, 0.4)");
      pedestalGrad.addColorStop(0.4, "rgba(232, 198, 98, 0.1)");
      pedestalGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = pedestalGrad;
      ctx.beginPath();
      ctx.ellipse(0, 360, 420, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      // Aura esférica de resplandor detrás de la botella
      const bottleAura = ctx.createRadialGradient(0, -40, 60, 0, -40, 450);
      bottleAura.addColorStop(0, "rgba(232, 198, 98, 0.28)");
      bottleAura.addColorStop(0.6, "rgba(232, 198, 98, 0.05)");
      bottleAura.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bottleAura;
      ctx.beginPath();
      ctx.arc(0, -40, 450, 0, Math.PI * 2);
      ctx.fill();

      // Contenedor elegante de cristal oscuro para el frasco
      ctx.fillStyle = "rgba(14, 14, 19, 0.95)";
      ctx.strokeStyle = "rgba(232, 198, 98, 0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-330, -370, 660, 720, 32);
      ctx.fill();
      ctx.stroke();

      // Dibujar la botella del perfume en alta resolución
      const img = loadedImages[perfume.id];
      if (img && img.complete && img.naturalWidth > 0) {
        const boxW = 580;
        const boxH = 650;
        const aspect = img.naturalWidth / img.naturalHeight;
        let drawW = boxW;
        let drawH = boxW / aspect;
        if (drawH > boxH) {
          drawH = boxH;
          drawW = boxH * aspect;
        }
        ctx.drawImage(img, -drawW / 2, -drawH / 2 - 10, drawW, drawH);

        // Destello de barrido de luz sobre el cristal (efecto comercial de lujo)
        const sweepX = -330 + localProg * 1320;
        const sweepGrad = ctx.createLinearGradient(sweepX - 80, -370, sweepX + 80, 350);
        sweepGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        sweepGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.18)");
        sweepGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.roundRect(-330, -370, 660, 720, 32);
        ctx.fill();
      }

      ctx.restore();

      // --- TEXTOS CINEMATOGRÁFICOS EN PANTALLA ---

      // Badge Superior Flotante
      ctx.fillStyle = "#E5C158";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 290, 275, 580, 58, 29);
      ctx.fill();

      ctx.font = "900 24px sans-serif";
      ctx.fillStyle = "#000000";
      ctx.fillText(perfume.badge, W / 2, 312);

      // Contador de posición: "1 de 4"
      ctx.font = "bold 20px sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillStyle = "#A1A1AA";
      ctx.fillText(`FRAGANCIA ${currentIndex + 1} DE ${selectedPerfumes.length}`, W / 2, 245);

      // MARCA / CASA PERFUMISTA
      ctx.font = "800 22px sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillStyle = "#E5C158";
      ctx.fillText(perfume.brand, W / 2, 1220);

      // NOMBRE DEL PERFUME EN ORO & BLANCO
      ctx.font = "900 48px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 12;
      ctx.fillText(perfume.name, W / 2, 1280);
      ctx.shadowBlur = 0;

      // NOTAS OLFATIVAS PRINCIPALES
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.strokeStyle = "rgba(232, 198, 98, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 450, 1320, 900, 68, 16);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 26px sans-serif";
      ctx.fillStyle = "#FFE600";
      ctx.fillText(`🌿 ${perfume.notes}`, W / 2, 1362);

      // HIGHLIGHT DE IMPACTO PSICOLÓGICO
      ctx.font = "700 28px sans-serif";
      ctx.fillStyle = "#E4E4E7";
      ctx.fillText(perfume.highlight, W / 2, 1435);

      // PRECIO EN COP CON TIPOGRAFÍA DE LUJO
      ctx.font = "900 64px sans-serif";
      ctx.fillStyle = "#FFE600";
      ctx.fillText(perfume.price, W / 2, 1525);

      if (perfume.oldPrice) {
        ctx.font = "600 30px sans-serif";
        ctx.fillStyle = "#71717A";
        ctx.fillText(`Antes: ${perfume.oldPrice}`, W / 2, 1570);
      }

      // BOTÓN CALL TO ACTION EN LA BASE
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 380, 1630, 760, 96, 24);
      ctx.fill();

      ctx.font = "900 30px sans-serif";
      ctx.fillStyle = "#000000";
      ctx.fillText("DISPONIBLE EN NERKLEY.COM  →", W / 2, 1690);

      // GARANTÍA INFERIOR
      ctx.font = "800 20px sans-serif";
      ctx.fillStyle = "#34D399";
      ctx.fillText("✓ PAGA CON NEQUI / BANCOLOMBIA • ENVÍO ASEGURADO", W / 2, 1770);

      return;
    }

    // ========================================================
    // ESCENA 3: CIERRE DE ALTO IMPACTO (CALL TO ACTION FINAL)
    // ========================================================
    const ctaProgress = (t - (HOOK_DURATION + selectedPerfumes.length * PERFUME_DURATION)) / CTA_DURATION;
    const pulse = 1 + 0.03 * Math.sin(ctaProgress * Math.PI * 4);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(pulse, pulse);

    const ctaAura = ctx.createRadialGradient(0, 0, 80, 0, 0, 500);
    ctaAura.addColorStop(0, "rgba(232, 198, 98, 0.3)");
    ctaAura.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = ctaAura;
    ctx.beginPath();
    ctx.arc(0, 0, 500, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "90px sans-serif";
    ctx.fillText("💎 🇨🇴 📦", 0, -290);

    ctx.font = "900 62px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("¿CUÁL VA A SER EL TUYO?", 0, -190);

    ctx.font = "900 76px serif";
    ctx.fillStyle = "#FFE600";
    ctx.fillText("NERKLEY.COM", 0, -90);

    // Caja de Beneficios
    ctx.fillStyle = "#111116";
    ctx.strokeStyle = "rgba(232, 198, 98, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-420, -10, 840, 250, 24);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText("✓ Envíos asegurados a toda Colombia con guía", -380, 50);
    ctx.fillText("✓ Pagos blindados con Wompi, Nequi y Bancolombia", -380, 115);
    ctx.fillText("✓ Batch Code 100% original garantizado", -380, 180);

    // Botón Gran CTA
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFE600";
    ctx.beginPath();
    ctx.roundRect(-400, 290, 800, 115, 28);
    ctx.fill();

    ctx.font = "900 36px sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("TOCA AQUÍ Y PIDE EL TUYO  👉", 0, 362);

    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#EF4444";
    ctx.fillText("⚠️ Unidades contadas por alta rotación de inventario", 0, 455);

    ctx.restore();
  };

  // Reproducción de Vista Previa
  const handlePlayPreview = () => {
    if (isPlaying) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const startTime = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const currentT = elapsed % totalDuration;
      setProgress((currentT / totalDuration) * 100);
      renderCinematicFrame(currentT);

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);
  };

  const handleStopPreview = () => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    setIsPlaying(false);
    setProgress(0);
    renderCinematicFrame(0);
  };

  // GRABAR Y EXPORTAR VIDEO .MP4 / .WEBM
  const handleRecordVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPlaying) handleStopPreview();

    setIsRecording(true);
    setStatusText("Preparando motor de grabación...");
    recordedChunksRef.current = [];

    const canvasStream = canvas.captureStream(30);
    const audioDest = setupAudio();
    let combinedStream = canvasStream;

    if (audioDest) {
      const audioTrack = audioDest.stream.getAudioTracks()[0];
      if (audioTrack) {
        combinedStream.addTrack(audioTrack);
      }
    }

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];

    let selectedMime = "";
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime || undefined,
        videoBitsPerSecond: 10000000, // 10 Mbps para máxima calidad y nitidez
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        setStatusText("Compilando video final...");
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMime || "video/webm",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const extension = selectedMime.includes("mp4") ? "mp4" : "webm";
        a.download = `nerkley-anuncio-tiktok-perfumes.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsRecording(false);
        setStatusText("¡Video cinematográfico descargado con éxito!");
      };

      recorder.start();
      setStatusText("Renderizando video para TikTok...");

      const fps = 30;
      const totalFrames = Math.floor(totalDuration * fps);
      let currentFrame = 0;

      const recordLoop = () => {
        if (currentFrame <= totalFrames) {
          const t = currentFrame / fps;
          setProgress((t / totalDuration) * 100);
          setStatusText(`Renderizando fotograma ${currentFrame}/${totalFrames} (${Math.round((t / totalDuration) * 100)}%)`);

          renderCinematicFrame(t);

          if (audioContextRef.current && audioDest) {
            playCinematicSoundAt(audioContextRef.current, audioDest, t);
          }

          currentFrame++;
          setTimeout(recordLoop, 1000 / fps);
        } else {
          recorder.stop();
        }
      };

      recordLoop();
    } catch (err: any) {
      console.error("Error al grabar:", err);
      setIsRecording(false);
      setStatusText(`Error al grabar: ${err.message}`);
    }
  };

  // Alternar selección de perfume
  const togglePerfume = (perfume: PerfumeScene) => {
    if (selectedPerfumes.some((p) => p.id === perfume.id)) {
      if (selectedPerfumes.length <= 2) {
        alert("Selecciona al menos 2 perfumes para el video.");
        return;
      }
      setSelectedPerfumes(selectedPerfumes.filter((p) => p.id !== perfume.id));
    } else {
      setSelectedPerfumes([...selectedPerfumes, perfume]);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white font-sans selection:bg-amber-400 selection:text-black pb-24">
      {/* Cabecera */}
      <header className="border-b border-white/10 bg-[#0c0c11]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#111115] border border-amber-400/30 flex items-center justify-center p-1 group-hover:scale-105 transition-all">
              <img src="/logo.svg" alt="NERKLEY" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-lg font-serif font-bold tracking-[0.25em] uppercase block leading-none">
                NERKLEY
              </span>
              <span className="text-[9px] uppercase tracking-widest text-amber-400 font-semibold">
                AI Commercial Video Studio • TikTok & Reels
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
            >
              &larr; Volver a la Tienda
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-block text-[10px] uppercase tracking-[0.3em] text-amber-300 bg-amber-400/10 border border-amber-400/30 px-4 py-1.5 rounded-full font-bold mb-3 shadow-[0_0_15px_rgba(232,198,98,0.2)]">
            🎬 Generador Cinematográfico 9:16 Ultra Lujo
          </span>
          <h1 className="text-2xl sm:text-5xl font-serif font-light uppercase tracking-wider text-white mb-3">
            Crea tu Anuncio Viral para TikTok
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Efectos visuales de estudio, iluminación volumétrica dorada, ganchos de psicología inversa de alta retención y renderizado en 1080x1920 listo para pauta publicitaria.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: PREVIEW DEL VIDEO VERTICAL (CANVAS) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[340px] aspect-[9/16] bg-black rounded-3xl border-4 border-[#22222b] shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={1080}
                height={1920}
                className="w-full h-full object-contain"
              />

              {imagesLoading && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center z-20">
                  <div className="w-10 h-10 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mb-3"></div>
                  <span className="text-xs font-semibold text-white">Cargando botellas en calidad 4K...</span>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-[11px] font-bold animate-pulse shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  <span>GRABANDO VIDEO...</span>
                </div>
              )}
            </div>

            {/* Barra de Progreso */}
            <div className="w-full max-w-[340px] mt-4">
              <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                <span>{statusText}</span>
                <span className="font-mono text-amber-300 font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-neutral-500 text-center mt-1">
                Duración: {totalDuration.toFixed(1)}s (Formato Vertical 9:16)
              </p>
            </div>

            {/* Botones de Control */}
            <div className="w-full max-w-[340px] mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleRecordVideo}
                disabled={isRecording || imagesLoading}
                className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black py-4 px-4 rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_10px_30px_rgba(232,198,98,0.35)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span className="text-lg">🎬</span>
                <span>{isRecording ? "Grabando fotogramas..." : "DESCARGAR VIDEO PARA TIKTOK (.MP4 / .WEBM)"}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePlayPreview}
                  disabled={isRecording || imagesLoading}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{isPlaying ? "⏸ Pausar" : "▶ Vista Previa"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStopPreview}
                  disabled={isRecording || imagesLoading}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white py-2.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>⏹ Reiniciar</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <span>🔊</span>
                  <span>Efectos de Sonido & Sub-Bass</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSoundEffectsEnabled(!soundEffectsEnabled)}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                    soundEffectsEnabled ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {soundEffectsEnabled ? "Activados" : "Silenciados"}
                </button>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: CONFIGURACIÓN DE GANCHO Y CATÁLOGO DE PERFUMES */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. SELECCIÓN DEL GANCHO VIRAL */}
            <div className="bg-[#101015] border border-white/10 rounded-2xl p-6 shadow-sm space-y-3">
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold block">
                Paso 1: Elige el Gancho Psicológico del Video
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Ganchos de Alta Retención para TikTok Ads
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {VIRAL_HOOKS.map((hook) => (
                  <button
                    key={hook.id}
                    type="button"
                    onClick={() => {
                      setActiveHook(hook);
                      renderCinematicFrame(0);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      activeHook.id === hook.id
                        ? "bg-amber-400/15 border-amber-400 text-white shadow-[0_0_15px_rgba(232,198,98,0.2)]"
                        : "bg-white/[0.02] border-white/10 text-neutral-400 hover:border-white/20"
                    }`}
                  >
                    <span className="text-[11px] font-bold block mb-1 text-white">
                      {hook.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 leading-tight block">
                      &quot;{hook.line1} {hook.line2}&quot;
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. CATÁLOGO COMPLETO DE PERFUMES (INCLUYE ALTO NICHO) */}
            <div className="bg-[#101015] border border-white/10 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold block">
                    Paso 2: Selecciona los Perfumes para el Anuncio
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Colección Nerkley (Nicho, Diseñador & Árabes)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30">
                  {selectedPerfumes.length} activos
                </span>
              </div>

              {/* Botones de Selección Rápida */}
              <div className="flex flex-wrap gap-2 pt-1 pb-2">
                <button
                  type="button"
                  onClick={() => setSelectedPerfumes(FULL_CATALOG_PERFUMES.filter((p) => p.categoryType === "nicho"))}
                  className="text-[10px] uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg text-amber-300 font-bold cursor-pointer"
                >
                  💎 Solo Alto Nicho (Bond No 9, Parfums Marly, Montale)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPerfumes(FULL_CATALOG_PERFUMES.filter((p) => p.categoryType === "disenador"))}
                  className="text-[10px] uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg text-neutral-300 font-bold cursor-pointer"
                >
                  👑 Diseñador (JPG Elixir, Versace, Dior)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPerfumes(FULL_CATALOG_PERFUMES.filter((p) => p.categoryType === "arabe"))}
                  className="text-[10px] uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg text-neutral-300 font-bold cursor-pointer"
                >
                  🔥 Virales Árabes (Khamrah Qahwa, 9PM, Club De Nuit)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {FULL_CATALOG_PERFUMES.map((perfume) => {
                  const isSelected = selectedPerfumes.some((p) => p.id === perfume.id);
                  return (
                    <button
                      key={perfume.id}
                      type="button"
                      onClick={() => togglePerfume(perfume)}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-400/10 border-amber-400/50 text-white shadow-sm"
                          : "bg-white/[0.02] border-white/10 text-neutral-400 hover:border-white/20"
                      }`}
                    >
                      <div className="w-14 h-16 bg-white/5 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center p-1 shrink-0">
                        <img
                          src={perfume.image}
                          alt={perfume.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] text-amber-400 font-bold block truncate">
                          {perfume.badge}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {perfume.name}
                        </h4>
                        <span className="text-[11px] font-mono text-neutral-300 block">
                          {perfume.price}
                        </span>
                      </div>
                      <span className="text-lg shrink-0">
                        {isSelected ? "✅" : "⚪"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. ESTRATEGIA PUBLICITARIA PARA TIKTOK */}
            <div className="bg-[#101015] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Texto del Anuncio para TikTok (Copia y Pega)
                </h3>
              </div>

              <div className="bg-[#08080b] border border-white/15 rounded-xl p-3.5 text-xs text-neutral-300 leading-relaxed font-mono">
                <p>
                  No te eches ninguno de estos perfumes si no quieres que todo el mundo te pregunte qué llevas puesto. 🔥🇨🇴 Fragancias de alto calibre, nicho y diseñador 100% auténticos con Batch Code en NERKLEY. Envíos asegurados a toda Colombia con pago Wompi (Nequi, Bancolombia, PSE y Tarjetas). ¡Toca el botón y pide el tuyo antes de que se agoten! 👇💎
                </p>
                <p className="mt-2 text-amber-400 font-semibold">
                  #perfumescolombia #perfumesnicho #bondno9colombia #lattafacolombia #jeanpaulgaultier #afnan9pm #perfumesoriginalescolombia #nerkley
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
