// Vibración y sonido para notificaciones en el dispositivo

export function vibrar(patron: number[] = [200, 100, 200]) {
  if ("vibrate" in navigator) {
    navigator.vibrate(patron);
  }
}

export function sonarNotificacion(tipo: "pedido" | "cuenta" | "listo") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (tipo === "pedido") {
      // Dos beeps rápidos
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (tipo === "listo") {
      // Tres beeps ascendentes
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else if (tipo === "cuenta") {
      // Un beep largo
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {
    // AudioContext no disponible — ignorar
  }
}

export function notificarPedidoListo(mesaNombre: string) {
  vibrar([200, 100, 200, 100, 200]);
  sonarNotificacion("listo");
}

export function notificarNuevoPedido() {
  vibrar([100, 50, 100]);
  sonarNotificacion("pedido");
}

export function notificarCuenta(mesaNombre: string) {
  vibrar([300, 100, 300]);
  sonarNotificacion("cuenta");
}