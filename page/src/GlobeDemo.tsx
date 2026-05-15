// GlobeDemo.tsx
import { useEffect, useRef } from "react";

export default function GlobeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = 140;

    const LAT_LINES = [-60, -30, 0, 30, 60];
    const LON_LINES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    const ANTENNAS = [
      { lon: 20,  lat: 15  },
      { lon: 100, lat: 35  },
      { lon: 200, lat: -10 },
      { lon: 280, lat: 50  },
      { lon: 310, lat: -30 },
      { lon: 150, lat: 60  },
    ];

    // signal rings ต่อ antenna
    const signals = ANTENNAS.map(() => ({ rings: [] as { r: number; alpha: number }[] }));

    // แปลง lon/lat → xyz บนทรงกลม
    const toXYZ = (lon: number, lat: number, rotY: number) => {
      const phi = (lat  * Math.PI) / 180;
      const lam = ((lon + rotY) * Math.PI) / 180;
      return {
        x:  Math.cos(phi) * Math.sin(lam),
        y: -Math.sin(phi),
        z:  Math.cos(phi) * Math.cos(lam),
      };
    };

    // project 3D → 2D canvas
    const project = (x: number, y: number) => ({
      px: cx + x * R,
      py: cy + y * R,
    });

    // วาด grid lat/lon
    const drawGrid = (rotY: number) => {
      ctx.strokeStyle = "rgba(79,70,229,0.18)";
      ctx.lineWidth = 0.6;

      LAT_LINES.forEach(lat => {
        ctx.beginPath();
        let first = true;
        for (let lon = 0; lon <= 360; lon += 3) {
          const { x, y, z } = toXYZ(lon, lat, rotY);
          if (z < 0) { first = true; continue; }
          const { px, py } = project(x, y);
          first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          first = false;
        }
        ctx.stroke();
      });

      LON_LINES.forEach(lon => {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 3) {
          const { x, y, z } = toXYZ(lon, lat, rotY);
          if (z < 0) { first = true; continue; }
          const { px, py } = project(x, y);
          first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          first = false;
        }
        ctx.stroke();
      });
    };

    // วาด antenna + signal rings
    const drawAntennas = (rotY: number, tick: number) => {
      ANTENNAS.forEach((ant, i) => {
        const { x, y, z } = toXYZ(ant.lon, ant.lat, rotY);
        if (z < 0.1) return;

        const { px, py } = project(x, y);
        const depth = (z + 1) / 2;
        const tH = 14 * depth;

        // tower
        ctx.strokeStyle = `rgba(34,211,238,${0.9 * depth})`;
        ctx.lineWidth = 1.5 * depth;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - tH);
        ctx.stroke();

        // หัว antenna
        ctx.strokeStyle = `rgba(34,211,238,${depth})`;
        ctx.lineWidth = depth;
        ctx.beginPath();
        ctx.moveTo(px - 4 * depth, py - tH);
        ctx.lineTo(px, py - tH - 5 * depth);
        ctx.lineTo(px + 4 * depth, py - tH);
        ctx.stroke();

        // spawn ring ใหม่
        if (tick % 60 === (i * 10) % 60) {
          signals[i].rings.push({ r: 0, alpha: 0.8 });
        }

        // วาด + update rings
        signals[i].rings = signals[i].rings.filter(ring => ring.alpha > 0.02);
        signals[i].rings.forEach(ring => {
          ring.r     += 1.2 * depth;
          ring.alpha -= 0.012;
          ctx.beginPath();
          ctx.arc(px, py - tH - 5 * depth, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(79,70,229,${ring.alpha * depth})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });
    };

    let angle = 0;
    let tick  = 0;
    let rafId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // ambient glow
      const grd = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.25);
      grd.addColorStop(0, "rgba(79,70,229,0.08)");
      grd.addColorStop(1, "rgba(79,70,229,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // โลก fill
      const earth = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, R);
      earth.addColorStop(0, "#1a2444");
      earth.addColorStop(1, "#080d1a");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = earth;
      ctx.fill();

      drawGrid(angle);

      // outline
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(79,70,229,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      drawAntennas(angle, tick);

      // specular highlight
      const spec = ctx.createRadialGradient(cx - 45, cy - 45, 5, cx - 30, cy - 30, R * 0.7);
      spec.addColorStop(0, "rgba(255,255,255,0.07)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      angle += 0.25;
      tick++;
      rafId = requestAnimationFrame(draw);
    };

    draw();

    // cleanup animation loop เมื่อ unmount
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={380}
      style={{ display: "block", margin: "0 auto" }}
    />
  );
}