"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface PerfumeScene {
  id: string;
  name: string;
  badge: string;
  notes: string;
  highlight: string;
  price: string;
  oldPrice?: string;
  image: string;
}

const PERFUMES_LIST: PerfumeScene[] = [
  {
    id: "jpg-elixir",
    name: "JEAN PAUL GAULTIER LE MALE ELIXIR",
    badge: "✨ EL REY DE LOS CUMPLIDOS",
    notes: "Miel dorada • Haba Tonka • Vainilla Negra",
    highlight: "Fijación extrema +12 Horas • Seducción pura",
    price: "$580.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/jeanpaul_elixir.jpg?v=1777137263&width=3000",
  },
  {
    id: "lattafa-qahwa",
    name: "LATTAFA KHAMRAH QAHWA",
    badge: "🔥 TENDENCIA N°1 EN TIKTOK",
    notes: "Café árabe • Canela dulce • Ámbar licoroso",
    highlight: "Aroma adictivo y cálido • Proyección bestial",
    price: "$320.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/perfume_lattafakhamrahqawha.jpg?v=1777137266&width=3000",
  },
  {
    id: "afnan-9pm",
    name: "AFNAN 9 PM NIGHT OUT",
    badge: "⚡ LA BESTIA NOCTURNA",
    notes: "Manzana dulce • Canela picante • Vainilla Bourbon",
    highlight: "El favorito para fiestas, citas y salidas nocturnas",
    price: "$358.200 COP",
    oldPrice: "$398.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/9pmnightout.jpg?v=1777136784&width=3000",
  },
  {
    id: "versace-flame",
    name: "VERSACE EROS FLAME",
    badge: "👑 MASCULINIDAD & PODER",
    notes: "Mandarina italiana • Pimienta de Madagascar • Cedro noble",
    highlight: "Intenso, llamativo y deja huella al pasar",
    price: "$450.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/Disenosintitulo_e1f57ce3-3ee4-453f-a645-f09ea17d3b3c.jpg?v=1777136697&width=3000",
  },
  {
    id: "club-de-nuit",
    name: "ARMAF CLUB DE NUIT INTENSE",
    badge: "💼 ELEGANCIA EJECUTIVA",
    notes: "Limón ahumado • Grosellas negras • Abedul de lujo",
    highlight: "El clon supremo más deseado del mundo",
    price: "$310.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/files/intenseman.jpg?v=1785374592&width=3000",
  },
  {
    id: "lattafa-asad",
    name: "LATTAFA ASAD LUXURY",
    badge: "💎 INTENSIDAD ÁRABE",
    notes: "Pimienta negra • Café tostado • Tabaco & Ámbar",
    highlight: "Inspirado en Dior Sauvage Elixir • Imponente",
    price: "$425.000 COP",
    image: "https://perfumeriamillennio.com/cdn/shop/products/Disenosintitulo3_eafbaf7d-cdef-4bce-ba05-129b71c8df66.jpg?v=1777137556&width=3000",
  },
];

export default function VideoAdStudioPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedPerfumes, setSelectedPerfumes] = useState<PerfumeScene[]>(PERFUMES_LIST.slice(0, 5));
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Listo para generar");
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [imagesLoading, setImagesLoading] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);

  const animationFrameId = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Duración total de cada fase (en segundos)
  const HOOK_DURATION = 3.0; // Gancho inicial
  const PERFUME_DURATION = 3.5; // Tiempo por perfume
  const CTA_DURATION = 3.5; // Llamado a la acción final

  const totalDuration = HOOK_DURATION + selectedPerfumes.length * PERFUME_DURATION + CTA_DURATION;

  // Precargar imágenes a través del proxy de Next.js para evitar problemas de CORS
  useEffect(() => {
    let isMounted = true;
    setImagesLoading(true);

    const loadAll = async () => {
      const map: { [key: string]: HTMLImageElement } = {};
      const promises = selectedPerfumes.map((p) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          // Usar proxy para garantizar que el canvas no se ensucie (tainted)
          img.src = `/api/proxy-image?url=${encodeURIComponent(p.image)}`;
          img.onload = () => {
            map[p.id] = img;
            resolve();
          };
          img.onerror = () => {
            console.warn(`Error al cargar imagen de ${p.name}, usando fallback`);
            resolve();
          };
        });
      });

      await Promise.all(promises);
      if (isMounted) {
        setLoadedImages(map);
        setImagesLoading(false);
        renderFrame(0); // Renderizar primer fotograma
      }
    };

    loadAll();

    return () => {
      isMounted = false;
    };
  }, [selectedPerfumes]);

  // Sintetizador Web Audio para música de fondo comercial (estilo deep trap/lujo)
  const setupAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const dest = ctx.createMediaStreamDestination();
      return dest;
    } catch (e) {
      console.error("AudioContext error:", e);
      return null;
    }
  };

  const playSynthesizedBeat = (ctx: AudioContext, dest: MediaStreamAudioDestinationNode, time: number) => {
    if (!musicEnabled) return;
    const bpm = 120;
    const beatInterval = 60 / bpm; // 0.5s por beat
    const totalBeats = Math.floor(time / beatInterval);

    // Solo tocar si estamos activos
    if (totalBeats % 2 === 0) {
      // Kick drum profundo
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(dest);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else {
      // Hi-hat brillante
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(8000, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(dest);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  };

  // Función principal de renderizado de cada fotograma en el Canvas (1080x1920)
  const renderFrame = (currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1080;
    const H = 1920;

    // 1. Fondo Dark Obsidian con gradiente sutil
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#08080b");
    bgGrad.addColorStop(0.5, "#0f0f15");
    bgGrad.addColorStop(1, "#060608");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Partículas doradas flotantes en movimiento continuo
    const particleCount = 28;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 137.5;
      const px = ((seed * 11) % W + currentTime * 40 * ((i % 3) + 1)) % W;
      const py = ((seed * 17) % H - currentTime * 70 * ((i % 2) + 0.8)) % H;
      const size = ((i % 4) + 1.5);
      const alpha = 0.2 + 0.4 * Math.sin(currentTime * 3 + i);

      ctx.fillStyle = `rgba(232, 198, 98, ${Math.max(0, alpha)})`;
      ctx.beginPath();
      ctx.arc(px, py < 0 ? py + H : py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Marco exterior de lujo en hilo de oro
    ctx.strokeStyle = "rgba(232, 198, 98, 0.25)";
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // Esquinas ornamentales estilo joyero
    const cornerSize = 40;
    ctx.strokeStyle = "#E5C158";
    ctx.lineWidth = 6;
    // Arriba Izq
    ctx.beginPath();
    ctx.moveTo(40, 40 + cornerSize);
    ctx.lineTo(40, 40);
    ctx.lineTo(40 + cornerSize, 40);
    ctx.stroke();
    // Arriba Der
    ctx.beginPath();
    ctx.moveTo(W - 40 - cornerSize, 40);
    ctx.lineTo(W - 40, 40);
    ctx.lineTo(W - 40, 40 + cornerSize);
    ctx.stroke();
    // Abajo Izq
    ctx.beginPath();
    ctx.moveTo(40, H - 40 - cornerSize);
    ctx.lineTo(40, H - 40);
    ctx.lineTo(40 + cornerSize, H - 40);
    ctx.stroke();
    // Abajo Der
    ctx.beginPath();
    ctx.moveTo(W - 40 - cornerSize, H - 40);
    ctx.lineTo(W - 40, H - 40);
    ctx.lineTo(W - 40, H - 40 - cornerSize);
    ctx.stroke();

    // 4. Barra de progreso superior al estilo TikTok Ads (aumenta retención)
    const totalProg = Math.min(1, currentTime / totalDuration);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(80, 80, W - 160, 10);
    ctx.fillStyle = "#E5C158";
    ctx.fillRect(80, 80, (W - 160) * totalProg, 10);

    // 5. Encabezado fijo de marca NERKLEY
    ctx.textAlign = "center";
    ctx.font = "bold 32px serif";
    ctx.letterSpacing = "6px";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("NERKLEY SHOWROOM", W / 2, 150);

    ctx.font = "600 20px sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillStyle = "#E5C158";
    ctx.fillText("COLOMBIA • BOUTIQUE OFICIAL", W / 2, 190);

    // ==========================================
    // ESCENA A: GANCHO INICIAL (0s a 3s)
    // ==========================================
    if (currentTime < HOOK_DURATION) {
      const hookProgress = currentTime / HOOK_DURATION;
      const scale = 1 + hookProgress * 0.05;

      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(scale, scale);

      // Resplandor de fondo
      const glow = ctx.createRadialGradient(0, 0, 50, 0, 0, 450);
      glow.addColorStop(0, "rgba(232, 198, 98, 0.2)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 450, 0, Math.PI * 2);
      ctx.fill();

      // Icono de fuego y corona
      ctx.font = "80px sans-serif";
      ctx.fillText("👑 🔥 🇨🇴", 0, -220);

      // Título Gancho Viral en Amarillo Neón / Blanco
      ctx.font = "900 68px sans-serif";
      ctx.fillStyle = "#FFE600";
      ctx.fillText("LOS 5 PERFUMES", 0, -110);

      ctx.font = "900 64px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("QUE MÁS CUMPLIDOS", 0, -30);

      ctx.font = "900 68px sans-serif";
      ctx.fillStyle = "#FFE600";
      ctx.fillText("GENERAN HOY", 0, 50);

      // Subtítulo hipnótico
      ctx.font = "600 36px sans-serif";
      ctx.fillStyle = "#D4D4D8";
      ctx.fillText("Si entras con uno de estos,", 0, 150);
      ctx.fillText("TODO EL MUNDO te preguntará qué llevas.", 0, 200);

      // Etiqueta de Autenticidad
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-300, 280, 600, 80, 16);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 26px sans-serif";
      ctx.fillStyle = "#34D399";
      ctx.fillText("🔒 100% ORIGINALES • BATCH CODES VERIFICABLES", 0, 330);

      ctx.restore();
      return;
    }

    // ==========================================
    // ESCENA B: PERFUMES EN ROTACIÓN
    // ==========================================
    const perfumeTime = currentTime - HOOK_DURATION;
    const currentPerfumeIndex = Math.floor(perfumeTime / PERFUME_DURATION);

    if (currentPerfumeIndex >= 0 && currentPerfumeIndex < selectedPerfumes.length) {
      const perfume = selectedPerfumes[currentPerfumeIndex];
      const localTime = perfumeTime % PERFUME_DURATION;
      const localProgress = localTime / PERFUME_DURATION;

      // Efecto Ken Burns suave (Zoom in)
      const zoom = 1 + localProgress * 0.08;

      ctx.save();
      ctx.translate(W / 2, 780);
      ctx.scale(zoom, zoom);

      // Resplandor dorado detrás de la botella
      const aura = ctx.createRadialGradient(0, 0, 80, 0, 0, 480);
      aura.addColorStop(0, "rgba(232, 198, 98, 0.28)");
      aura.addColorStop(0.5, "rgba(232, 198, 98, 0.08)");
      aura.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 480, 0, Math.PI * 2);
      ctx.fill();

      // Marco contenedor de la botella
      ctx.fillStyle = "#121217";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-340, -380, 680, 760, 28);
      ctx.fill();
      ctx.stroke();

      // Imagen del perfume
      const img = loadedImages[perfume.id];
      if (img && img.complete && img.naturalWidth > 0) {
        // Dibujar imagen centrada y escalada
        const boxW = 600;
        const boxH = 680;
        const aspect = img.naturalWidth / img.naturalHeight;
        let drawW = boxW;
        let drawH = boxW / aspect;
        if (drawH > boxH) {
          drawH = boxH;
          drawW = boxH * aspect;
        }
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        // Fallback elegante si tarda la imagen
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 44px serif";
        ctx.fillText(perfume.name, 0, 0);
      }

      ctx.restore();

      // --- TEXTOS Y CARTELES EN LA PARTE INFERIOR Y SUPERIOR ---

      // Badge Flotante (Arriba de la imagen)
      ctx.fillStyle = "#E5C158";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 280, 310, 560, 64, 32);
      ctx.fill();

      ctx.font = "900 24px sans-serif";
      ctx.fillStyle = "#000000";
      ctx.fillText(perfume.badge, W / 2, 350);

      // Contador de posición: "1 de 5"
      ctx.font = "bold 22px sans-serif";
      ctx.fillStyle = "#A1A1AA";
      ctx.fillText(`TOP ${currentPerfumeIndex + 1} DE ${selectedPerfumes.length}`, W / 2, 270);

      // TÍTULO DEL PERFUME (Grande y legible en celular)
      ctx.font = "900 46px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.fillText(perfume.name, W / 2, 1280);
      ctx.shadowBlur = 0;

      // NOTAS OLFATIVAS
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.strokeStyle = "rgba(232, 198, 98, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 440, 1330, 880, 70, 16);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 26px sans-serif";
      ctx.fillStyle = "#E5C158";
      ctx.fillText(`🌿 ${perfume.notes}`, W / 2, 1374);

      // HIGHLIGHT DE IMPACTO
      ctx.font = "600 28px sans-serif";
      ctx.fillStyle = "#E4E4E7";
      ctx.fillText(perfume.highlight, W / 2, 1450);

      // PRECIO EN COP CON EFECTO DE ORO
      ctx.font = "900 62px sans-serif";
      ctx.fillStyle = "#FFE600";
      ctx.fillText(perfume.price, W / 2, 1540);

      if (perfume.oldPrice) {
        ctx.font = "500 32px sans-serif";
        ctx.fillStyle = "#71717A";
        ctx.fillText(`Antes: ${perfume.oldPrice}`, W / 2, 1590);
      }

      // BOTÓN / LLAMADO INFERIOR
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 380, 1640, 760, 96, 24);
      ctx.fill();

      ctx.font = "900 30px sans-serif";
      ctx.fillStyle = "#000000";
      ctx.fillText("DISPONIBLE EN NERKLEY.COM  →", W / 2, 1700);

      // Indicador de confianza en el pie
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = "#34D399";
      ctx.fillText("✓ PAGA CON NEQUI / BANCOLOMBIA • ENVÍO ASEGURADO", W / 2, 1780);

      return;
    }

    // ==========================================
    // ESCENA C: CIERRE & LLAMADO A LA ACCIÓN (CTA FINAL)
    // ==========================================
    const ctaProgress = (currentTime - (HOOK_DURATION + selectedPerfumes.length * PERFUME_DURATION)) / CTA_DURATION;
    const pulse = 1 + 0.04 * Math.sin(ctaProgress * Math.PI * 4);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(pulse, pulse);

    // Fondo dorado radial intenso
    const ctaAura = ctx.createRadialGradient(0, 0, 100, 0, 0, 500);
    ctaAura.addColorStop(0, "rgba(232, 198, 98, 0.25)");
    ctaAura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ctaAura;
    ctx.beginPath();
    ctx.arc(0, 0, 500, 0, Math.PI * 2);
    ctx.fill();

    // Sello de Garantía
    ctx.font = "90px sans-serif";
    ctx.fillText("💎 🇨🇴 📦", 0, -280);

    ctx.font = "900 60px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("¿CUÁL VA A SER EL TUYO?", 0, -180);

    ctx.font = "900 72px serif";
    ctx.fillStyle = "#FFE600";
    ctx.fillText("NERKLEY.COM", 0, -80);

    // Caja de Beneficios
    ctx.fillStyle = "#111116";
    ctx.strokeStyle = "rgba(232, 198, 98, 0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-420, 0, 840, 240, 24);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText("✓ Envíos rápidos asegurados a toda Colombia", -380, 60);
    ctx.fillText("✓ Paga seguro con Nequi, Bancolombia o Wompi", -380, 120);
    ctx.fillText("✓ Perfumes 100% Originales con Batch Code", -380, 180);

    // Botón Gran CTA
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFE600";
    ctx.beginPath();
    ctx.roundRect(-400, 280, 800, 110, 28);
    ctx.fill();

    ctx.font = "900 36px sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("TOCA AQUÍ Y PIDE EL TUYO  👉", 0, 350);

    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#EF4444";
    ctx.fillText("⚠️ Pocas unidades disponibles por alta demanda", 0, 440);

    ctx.restore();
  };

  // Reproducir vista previa animada
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
      renderFrame(currentT);

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);
  };

  // Detener preview
  const handleStopPreview = () => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    setIsPlaying(false);
    setProgress(0);
    renderFrame(0);
  };

  // Grabar y exportar video para TikTok (.webm / .mp4 compatible)
  const handleRecordVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPlaying) handleStopPreview();

    setIsRecording(true);
    setStatusText("Preparando grabación...");
    recordedChunksRef.current = [];

    // Iniciar stream de canvas a 30 FPS
    const canvasStream = canvas.captureStream(30);

    // Configurar stream de audio
    const audioDest = setupAudio();
    let combinedStream = canvasStream;

    if (audioDest) {
      const audioTrack = audioDest.stream.getAudioTracks()[0];
      if (audioTrack) {
        combinedStream.addTrack(audioTrack);
      }
    }

    // Seleccionar el mejor codec soportado por el navegador
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
        videoBitsPerSecond: 8000000, // 8 Mbps para excelente nitidez en TikTok
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        setStatusText("Procesando archivo final...");
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMime || "video/webm",
        });

        // Crear enlace de descarga automático
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
        setStatusText("¡Video descargado con éxito!");
      };

      recorder.start();
      setStatusText("Grabando video para TikTok...");

      // Renderizar el video frame por frame
      const fps = 30;
      const totalFrames = Math.floor(totalDuration * fps);
      let currentFrame = 0;

      const recordLoop = () => {
        if (currentFrame <= totalFrames) {
          const t = currentFrame / fps;
          setProgress((t / totalDuration) * 100);
          setStatusText(`Renderizando fotograma ${currentFrame}/${totalFrames} (${Math.round((t / totalDuration) * 100)}%)`);

          renderFrame(t);

          if (audioContextRef.current && audioDest) {
            playSynthesizedBeat(audioContextRef.current, audioDest, t);
          }

          currentFrame++;
          setTimeout(recordLoop, 1000 / fps);
        } else {
          recorder.stop();
        }
      };

      recordLoop();
    } catch (err: any) {
      console.error("Error al grabar video:", err);
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
    <div className="min-h-screen bg-[#0a0a0d] text-white font-sans selection:bg-amber-400 selection:text-black pb-20">
      {/* Cabecera */}
      <header className="border-b border-white/10 bg-[#0e0e13]/90 backdrop-blur-md sticky top-0 z-40">
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
                TikTok Ads Creator Studio
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
          <span className="inline-block text-[10px] uppercase tracking-[0.3em] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 rounded-full font-semibold mb-3">
            Herramienta Oficial de Publicidad
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-light uppercase tracking-wider text-white mb-3">
            Generador de Videos para TikTok & Reels
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Crea un anuncio publicitario profesional en formato vertical 9:16 (1080x1920) optimizado con alta retención, ganchos psicológicos, precios en COP y llamado a la acción para pauta paga.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: PREVIEW DEL VIDEO VERTICAL (CANVAS) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[340px] aspect-[9/16] bg-black rounded-3xl border-4 border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center">
              {/* Canvas oculto que dibuja a 1080x1920 pero se muestra a escala en CSS */}
              <canvas
                ref={canvasRef}
                width={1080}
                height={1920}
                className="w-full h-full object-contain"
              />

              {/* Indicador de carga de imágenes */}
              {imagesLoading && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center z-20">
                  <div className="w-10 h-10 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mb-3"></div>
                  <span className="text-xs font-semibold text-white">Cargando frascos en alta resolución...</span>
                </div>
              )}

              {/* Overlay de grabación activa */}
              {isRecording && (
                <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-[11px] font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  <span>GRABANDO VIDEO...</span>
                </div>
              )}
            </div>

            {/* Barra de Progreso */}
            <div className="w-full max-w-[340px] mt-4">
              <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                <span>{statusText}</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-neutral-500 text-center mt-1">
                Duración total: {totalDuration} segundos
              </p>
            </div>

            {/* Controles de Reproducción y Grabación */}
            <div className="w-full max-w-[340px] mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleRecordVideo}
                disabled={isRecording || imagesLoading}
                className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black py-4 px-4 rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_10px_25px_rgba(232,198,98,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span className="text-lg">🎬</span>
                <span>{isRecording ? "Grabando... espera un momento" : "GENERAR Y DESCARGAR VIDEO (.MP4 / .WEBM)"}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePlayPreview}
                  disabled={isRecording || imagesLoading}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                  <span>🎵</span>
                  <span>Audio / Ritmo Integrado</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                    musicEnabled ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {musicEnabled ? "Activado" : "Silenciado"}
                </button>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: SELECCIÓN DE PERFUMES & KIT DE PUBLICIDAD TIKTOK */}
          <div className="lg:col-span-7 space-y-6">
            {/* Selección de Perfumes a Incluir */}
            <div className="bg-[#111116] border border-white/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Perfumes Seleccionados para el Anuncio
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Marca o desmarca para elegir cuáles frascos quieres que aparezcan en el video.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                  {selectedPerfumes.length} activos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                {PERFUMES_LIST.map((perfume) => {
                  const isSelected = selectedPerfumes.some((p) => p.id === perfume.id);
                  return (
                    <button
                      key={perfume.id}
                      type="button"
                      onClick={() => togglePerfume(perfume)}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-400/10 border-amber-400/40 text-white"
                          : "bg-white/[0.02] border-white/10 text-neutral-400 hover:border-white/20"
                      }`}
                    >
                      <div className="w-12 h-14 bg-white/5 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center p-1 shrink-0">
                        <img
                          src={perfume.image}
                          alt={perfume.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-amber-400 font-bold block truncate">
                          {perfume.badge}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {perfume.name}
                        </h4>
                        <span className="text-[11px] font-mono text-neutral-300">
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

            {/* ESTRATEGIA PARA TIKTOK ADS (PAUTA PAGA) */}
            <div className="bg-[#111116] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Kit de Pauta Publicitaria para TikTok Ads
                </h3>
              </div>

              {/* Copy para la descripción de TikTok */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
                  Texto sugerido para el anuncio (Copia y Pega):
                </label>
                <div className="bg-[#09090c] border border-white/15 rounded-xl p-3 text-xs text-neutral-300 leading-relaxed font-mono relative group">
                  <p>
                    ¿Buscas un perfume que de verdad dure todo el día y lluevan cumplidos? 🔥🇨🇴 En NERKLEY tenemos los perfumes más virales y cotizados de 2026. 100% auténticos con Batch Code verificable. Envíos asegurados a toda Colombia con pago por Wompi (Nequi, Bancolombia, PSE y Tarjetas). ¡Pide el tuyo en el enlace antes de que se agoten! 👇💎
                  </p>
                  <p className="mt-2 text-amber-400 font-semibold">
                    #perfumescolombia #perfumesmasculinos #lattafacolombia #jeanpaulgaultier #afnan9pm #perfumeriabogota #perfumeriamedellin #nerkley
                  </p>
                </div>
              </div>

              {/* Guía de Configuración de Campaña */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
                  <span className="text-white font-bold block mb-1">🎯 Objetivo en TikTok Ads</span>
                  <p className="text-neutral-400 text-[11px]">
                    Elige <strong>&quot;Conversiones en el sitio web&quot;</strong> o <strong>&quot;Tráfico&quot;</strong> dirigido a tu página oficial: <code className="text-amber-300">nerkley.com</code>
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
                  <span className="text-white font-bold block mb-1">📍 Segmentación Recomendada</span>
                  <p className="text-neutral-400 text-[11px]">
                    Ubicación: <strong>Colombia</strong> (Todas las ciudades). Edad: <strong>18 a 42 años</strong>. Intereses: Fragancias, Moda de lujo, Cuidado personal.
                  </p>
                </div>
              </div>

              {/* Recomendación de Sonido / Música */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
                💡 <strong>Consejo Pro para TikTok:</strong> Al subir el video a TikTok, puedes usar el audio que viene en el video o añadir una canción en tendencia desde la biblioteca comercial de TikTok (ej. phonk o beats de lujo) con el volumen al 30%. Esto aumenta hasta un 40% el alcance orgánico y la aprobación del anuncio.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
