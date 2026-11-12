import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PARTS, carouselAngle, featherData, partOffset } from "./turnaround";

const MODEL_URL = `${import.meta.env.BASE_URL}models/hero.glb`;
const LAYOUT = {
  desktop: { position: [-1.5, 0, 0], scale: 1 },
  mobile: { position: [0, 0.55, 0], scale: 0.72 },
};

useLoader.preload(GLTFLoader, MODEL_URL);

/** ۵ نمای مدل روی حلقه‌ای از پنل‌ها + پایه. فقط position/rotation چند Mesh در هر فریم تغییر می‌کند. */
function Model({ progress, layout }) {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const anisotropy = useThree((s) => Math.min(s.gl.capabilities.getMaxAnisotropy(), 8));
  const outer = useRef(null);
  const rotor = useRef(null);
  const meshes = useRef({});
  const smooth = useRef(progress.current);

  const built = useMemo(() => {
    // لبه‌های عکس‌ها را نرم می‌کنیم تا با پس‌زمینه تیره Hero ترکیب شوند (کفش‌ها در پایین کمتر محو می‌شوند)
    const mask = new THREE.DataTexture(featherData(64, 128, { left: 0.2, right: 0.2, top: 0.12, bottom: 0.05 }), 64, 128, THREE.RGBAFormat);
    mask.magFilter = THREE.LinearFilter;
    mask.minFilter = THREE.LinearFilter;
    mask.needsUpdate = true;

    const parts = PARTS.map((part) => {
      const source = gltf.scene.getObjectByName(part.node);
      if (!source?.geometry) return null;
      // هندسه را دور مرکز خودش می‌گذاریم تا قطعه هنگام ورود حول مرکز خودش بچرخد
      const geometry = source.geometry.clone();
      geometry.computeBoundingBox();
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -center.y, -center.z);

      let material;
      if (part.kind === "view") {
        const map = source.material.map;
        map.anisotropy = anisotropy;
        material = new THREE.MeshBasicMaterial({ map, alphaMap: mask, transparent: true, depthWrite: false, toneMapped: false });
      } else {
        material = new THREE.MeshStandardMaterial({ color: "#e1dce8", roughness: 0.7, metalness: 0 });
      }
      return { part, geometry, material, base: center.toArray() };
    }).filter(Boolean);
    return { parts, mask };
  }, [gltf, anisotropy]);

  useEffect(() => () => {
    built.mask.dispose();
    built.parts.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); });
  }, [built]);

  useFrame(({ pointer }, delta) => {
    // میرایی نرم؛ توقف یا پرش اسکرول، حرکت را نمی‌لرزاند
    smooth.current = THREE.MathUtils.damp(smooth.current, progress.current, 5, delta);
    const p = smooth.current;

    built.parts.forEach(({ part, base }) => {
      const mesh = meshes.current[part.id];
      if (!mesh) return;
      const o = partOffset(part, p);
      mesh.position.set(base[0] + o.position[0], base[1] + o.position[1], base[2] + o.position[2]);
      mesh.rotation.set(o.rotation[0], o.rotation[1], o.rotation[2]);
    });
    if (rotor.current) rotor.current.rotation.y = carouselAngle(p);
    if (outer.current) {
      outer.current.rotation.y = THREE.MathUtils.damp(outer.current.rotation.y, pointer.x * 0.08, 4, delta);
      outer.current.rotation.x = THREE.MathUtils.damp(outer.current.rotation.x, -pointer.y * 0.03, 4, delta);
    }
  });

  return (
    <group ref={outer} position={layout.position} scale={layout.scale}>
      <group ref={rotor}>
        {built.parts.map(({ part, geometry, material, base }) => (
          <mesh
            key={part.id}
            ref={(el) => { meshes.current[part.id] = el; }}
            geometry={geometry}
            material={material}
            position={base}
            renderOrder={part.kind === "base" ? 0 : 1}
          />
        ))}
      </group>
    </group>
  );
}

export default function HeroModel({ progress, frameloop, eventSource, mobile }) {
  return (
    <Canvas
      dpr={mobile ? 1 : [1, 1.5]}
      camera={{ position: [0, 0.55, 6.4], fov: 30 }}
      frameloop={frameloop}
      eventSource={eventSource}
      eventPrefix="client"
      gl={{ antialias: !mobile, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ camera }) => camera.lookAt(0, -0.1, 0)}
    >
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Model progress={progress} layout={mobile ? LAYOUT.mobile : LAYOUT.desktop} />
    </Canvas>
  );
}
