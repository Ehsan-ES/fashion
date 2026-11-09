import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const WIDTH = 6;
const HEIGHT = 8;

/** پارچه ساتن معلق که با موج نرم و حرکت موس تکان می‌خورد (بدون فایل مدل؛ فقط هندسه رویه‌ای). */
function Cloth() {
  const mesh = useRef(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(WIDTH, HEIGHT, 48, 60), []);
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry]);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const wave =
        Math.sin(x * 1.1 + t * 0.7) * 0.38 +
        Math.sin(y * 0.8 + t * 0.55) * 0.28 +
        Math.sin((x + y) * 0.65 + t * 1.05) * 0.16;
      const edge = 1 - Math.min(Math.abs(x) / (WIDTH / 2), 1) * 0.55;
      pos.setZ(i, wave * edge);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    if (mesh.current) {
      mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, -0.35 + pointer.x * 0.3, 0.05);
      mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, -0.25 + pointer.y * 0.12, 0.05);
    }
  });

  return (
    <mesh ref={mesh} geometry={geometry} position={[2.2, -0.2, 0]} rotation={[-0.25, -0.35, 0.15]}>
      <meshStandardMaterial color="#b69b70" metalness={0.45} roughness={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function HeroCloth({ active, eventSource }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 45 }}
      frameloop={active ? "always" : "never"}
      eventSource={eventSource}
      eventPrefix="client"
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} color="#f8f6f2" />
      <directionalLight position={[-5, -2, 2]} intensity={0.9} color="#d8c9b5" />
      <Cloth />
    </Canvas>
  );
}
