import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, MeshReflectorMaterial, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import styles from "./showroom.module.css";

const MODEL_URL = `${import.meta.env.BASE_URL}models/hero.glb`;

function getProductKind(product) {
  const label = `${product.category?.name ?? ""} ${product.name}`.toLowerCase();
  if (/(کیف|کفش|اکسسوری|زیور|کمربند|ساعت|کلاه)/u.test(label)) return "accessory";
  if (/(شلوار|دامن|شورت)/u.test(label)) return "bottom";
  if (/(پیراهن بلند|پیراهن مجلسی|مانتو|لباس|دامن بلند)/u.test(label)) return "dress";
  return "apparel";
}

function createGarmentShape(product) {
  const shape = new THREE.Shape();
  if (getProductKind(product) === "bottom") {
    shape.moveTo(-0.36, 0.54);
    shape.lineTo(0.36, 0.54);
    shape.lineTo(0.29, -0.59);
    shape.lineTo(0.035, -0.59);
    shape.lineTo(0, -0.04);
    shape.lineTo(-0.035, -0.59);
    shape.lineTo(-0.29, -0.59);
    shape.closePath();
    return shape;
  }
  if (getProductKind(product) === "dress") {
    shape.moveTo(-0.28, 0.53);
    shape.lineTo(-0.48, 0.31);
    shape.lineTo(-0.36, 0.02);
    shape.lineTo(-0.56, -0.57);
    shape.quadraticCurveTo(0, -0.74, 0.56, -0.57);
    shape.lineTo(0.36, 0.02);
    shape.lineTo(0.48, 0.31);
    shape.lineTo(0.28, 0.53);
    shape.quadraticCurveTo(0, 0.35, -0.28, 0.53);
    return shape;
  }
  shape.moveTo(-0.3, 0.53);
  shape.lineTo(-0.5, 0.39);
  shape.lineTo(-0.68, 0.11);
  shape.lineTo(-0.48, -0.02);
  shape.lineTo(-0.38, 0.13);
  shape.lineTo(-0.34, -0.56);
  shape.quadraticCurveTo(0, -0.66, 0.34, -0.56);
  shape.lineTo(0.38, 0.13);
  shape.lineTo(0.48, -0.02);
  shape.lineTo(0.68, 0.11);
  shape.lineTo(0.5, 0.39);
  shape.lineTo(0.3, 0.53);
  shape.quadraticCurveTo(0, 0.31, -0.3, 0.53);
  return shape;
}

function createBagShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, -0.28);
  shape.lineTo(-0.31, 0.12);
  shape.quadraticCurveTo(-0.3, 0.28, -0.14, 0.29);
  shape.lineTo(0.14, 0.29);
  shape.quadraticCurveTo(0.3, 0.28, 0.31, 0.12);
  shape.lineTo(0.34, -0.28);
  shape.quadraticCurveTo(0, -0.38, -0.34, -0.28);
  return shape;
}

function createLabelTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create showroom label texture.");
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function CampaignModel() {
  const gltf = useGLTF(MODEL_URL);
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 2.25 / Math.max(size.x, size.y, size.z, 1);
    const center = bounds.getCenter(new THREE.Vector3());
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    return clone;
  }, [gltf.scene]);
  const display = useRef(null);
  useFrame((_, delta) => {
    if (display.current) display.current.rotation.y += delta * 0.09;
  });
  return (
    <group ref={display} position={[0, 1.2, -13.6]}>
      <primitive object={model} />
    </group>
  );
}

function Garment({ product, onSelect, position, scale = 1 }) {
  const geometry = useMemo(
    () => new THREE.ExtrudeGeometry(createGarmentShape(product), { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 }),
    [product],
  );

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, 0.02]} castShadow geometry={geometry}
        onClick={(event) => { event.stopPropagation(); onSelect(product); }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}>
        <meshPhysicalMaterial color={product.colors?.[0]?.hex ?? "#b29a82"}
          roughness={0.77} metalness={0} sheen={0.55} sheenRoughness={0.9} clearcoat={0.08} />
      </mesh>
      <mesh position={[0, 0.48, -0.04]} rotation={[0, 0, Math.PI]} castShadow>
        <torusGeometry args={[0.12, 0.018, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#b99666" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.42, 0.04]} castShadow>
        <boxGeometry args={[0.65, 0.025, 0.035]} />
        <meshStandardMaterial color="#b99666" metalness={0.55} roughness={0.34} />
      </mesh>
    </group>
  );
}

function AccessoryDisplay({ product, onSelect, position }) {
  const color = product.colors?.[0]?.hex ?? "#947858";
  const kind = `${product.category?.name ?? ""} ${product.name}`.toLowerCase();
  const isShoe = /(کفش|بوت|صندل)/u.test(kind);
  return (
    <group position={position} onClick={(event) => { event.stopPropagation(); onSelect(product); }}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.47, 0.22, 32]} />
        <meshStandardMaterial color="#a98b63" metalness={0.62} roughness={0.32} />
      </mesh>
      {isShoe ? (
        <>
          <mesh position={[0, 0.39, 0.01]} scale={[0.42, 0.22, 0.22]} castShadow>
            <sphereGeometry args={[1, 24, 18]} />
            <meshPhysicalMaterial color={color} roughness={0.52} clearcoat={0.18} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.82, 0.08, 0.34]} />
            <meshStandardMaterial color="#4c4034" roughness={0.6} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.76, 0]} castShadow>
            <extrudeGeometry args={[createBagShape(), { depth: 0.12, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.035, bevelThickness: 0.025 }]} />
            <meshPhysicalMaterial color={color} roughness={0.58} clearcoat={0.2} />
          </mesh>
          <mesh position={[0, 0.73, 0.15]}>
            <boxGeometry args={[0.56, 0.14, 0.04]} />
            <meshStandardMaterial color="#c6a674" metalness={0.55} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.08, 0]} rotation={[0, 0, Math.PI]} castShadow>
            <torusGeometry args={[0.2, 0.035, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#b99666" metalness={0.66} roughness={0.28} />
          </mesh>
        </>
      )}
      <mesh position={[0, -0.01, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.16, 16]} />
        <meshStandardMaterial color="#a98b63" metalness={0.68} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.32, 0.36, 0.06, 28]} />
        <meshStandardMaterial color="#a98b63" metalness={0.62} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Mannequin({ product, onSelect, position }) {
  return (
    <group position={position} onClick={(event) => { event.stopPropagation(); onSelect(product); }}>
      <mesh position={[0, 1.95, 0]} castShadow>
        <sphereGeometry args={[0.19, 28, 24]} />
        <meshPhysicalMaterial color="#d9d0c4" roughness={0.31} metalness={0.08} clearcoat={0.35} />
      </mesh>
      <mesh position={[0, 1.68, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.25, 24]} />
        <meshPhysicalMaterial color="#d9d0c4" roughness={0.34} />
      </mesh>
      <mesh position={[0, 1.1, 0]} scale={[0.42, 0.67, 0.22]} castShadow>
        <sphereGeometry args={[1, 28, 24]} />
        <meshPhysicalMaterial color="#d9d0c4" roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.43, 0]} scale={[0.34, 0.43, 0.18]} castShadow>
        <sphereGeometry args={[1, 28, 24]} />
        <meshPhysicalMaterial color="#d9d0c4" roughness={0.42} />
      </mesh>
      <mesh position={[-0.48, 1.09, 0]} rotation={[0, 0, -0.12]} castShadow>
        <capsuleGeometry args={[0.075, 0.72, 5, 12]} />
        <meshPhysicalMaterial color="#d9d0c4" roughness={0.42} />
      </mesh>
      <mesh position={[0.48, 1.09, 0]} rotation={[0, 0, 0.12]} castShadow>
        <capsuleGeometry args={[0.075, 0.72, 5, 12]} />
        <meshPhysicalMaterial color="#d9d0c4" roughness={0.42} />
      </mesh>
      <Garment product={product} onSelect={onSelect} position={[0, 1.26, 0.22]} scale={0.72} />
      <mesh position={[0, -0.01, 0]}>
        <cylinderGeometry args={[0.36, 0.42, 0.08, 32]} />
        <meshStandardMaterial color="#aa8b64" metalness={0.58} roughness={0.33} />
      </mesh>
      <mesh position={[0, -0.39, 0]}>
        <cylinderGeometry args={[0.035, 0.06, 0.72, 16]} />
        <meshStandardMaterial color="#aa8b64" metalness={0.64} roughness={0.29} />
      </mesh>
      <mesh position={[0, -0.77, 0]}>
        <cylinderGeometry args={[0.28, 0.33, 0.08, 32]} />
        <meshStandardMaterial color="#aa8b64" metalness={0.58} roughness={0.33} />
      </mesh>
    </group>
  );
}

function Rack({ products, onSelect, position }) {
  const garments = products.filter((product) => getProductKind(product) === "apparel" || getProductKind(product) === "bottom" || getProductKind(product) === "dress");
  const rackWidth = Math.min(7.6, Math.max(3.8, garments.length * 0.62));
  const hangerGap = (rackWidth - 0.55) / Math.max(garments.length, 1);
  const garmentScale = garments.length > 8 ? 0.43 : garments.length > 5 ? 0.56 : 0.72;
  if (!garments.length) return null;
  return (
    <group position={position}>
      <mesh position={[0, 2.45, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, rackWidth, 16]} />
        <meshStandardMaterial color="#a98b63" metalness={0.72} roughness={0.27} />
      </mesh>
      {[-rackWidth / 2, rackWidth / 2].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.25, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 2.5, 12]} />
            <meshStandardMaterial color="#a98b63" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[x, 0.05, 0]}>
            <cylinderGeometry args={[0.38, 0.38, 0.055, 24]} />
            <meshStandardMaterial color="#a98b63" metalness={0.65} roughness={0.32} />
          </mesh>
        </group>
      ))}
      {garments.map((product, index) => (
        <Garment key={product.id} product={product} onSelect={onSelect}
          position={[-rackWidth / 2 + 0.3 + index * hangerGap, 1.43, 0.03]}
          scale={garmentScale} />
      ))}
    </group>
  );
}

function Shelf({ product, position }) {
  return (
    <group position={position}>
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 1.05, 0]}>
          <boxGeometry args={[0.055, 2.1, 0.48]} />
          <meshStandardMaterial color="#a88a64" metalness={0.4} roughness={0.42} />
        </mesh>
      ))}
      {[0.25, 0.95, 1.65].map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0]}>
            <boxGeometry args={[1.72, 0.075, 0.58]} />
            <meshStandardMaterial color="#b29773" roughness={0.46} />
          </mesh>
          <mesh position={[-0.35, y + 0.16, 0.02]}>
            <boxGeometry args={[0.68, 0.23, 0.4]} />
            <meshPhysicalMaterial color={product?.colors?.[0]?.hex ?? "#b7a58d"} roughness={0.85} />
          </mesh>
          <mesh position={[0.38, y + 0.13, 0.02]}>
            <boxGeometry args={[0.58, 0.18, 0.39]} />
            <meshPhysicalMaterial color="#e1d4c2" roughness={0.88} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SectionSign({ title, position }) {
  const texture = useMemo(() => createLabelTexture(512, 160, (context, width, height) => {
    context.fillStyle = "#2d261e";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#c5a576";
    context.lineWidth = 5;
    context.strokeRect(5, 5, width - 10, height - 10);
    context.direction = "rtl";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#f8edda";
    context.font = "600 48px Vazirmatn, Arial, sans-serif";
    context.fillText(title, width / 2, height / 2, width - 40);
  }), [title]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position}>
      <planeGeometry args={[1.1, 0.38]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function ProductTag({ product, onSelect, position }) {
  const texture = useMemo(() => createLabelTexture(512, 280, (context, width, height) => {
    context.fillStyle = "#f7f2e9";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#b99666";
    context.lineWidth = 5;
    context.strokeRect(5, 5, width - 10, height - 10);
    context.direction = "rtl";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#776246";
    context.font = "500 22px Arial, sans-serif";
    context.fillText("BOUTIQUE · OBJECTS OF DESIRE", width / 2, 42);
    context.fillStyle = "#322920";
    context.font = "600 34px Vazirmatn, Arial, sans-serif";
    context.fillText(product.name, width / 2, 128, width - 32);
    context.fillStyle = "#846b4d";
    context.font = "400 26px Vazirmatn, Arial, sans-serif";
    context.fillText(product.brand?.name ?? "BOUTIQUE", width / 2, 190, width - 32);
    context.fillStyle = product.colors?.[0]?.hex ?? "#b99666";
    context.fillRect(32, 235, width - 64, 18);
  }), [product]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(product);
      }}
      onPointerOver={() => { document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[1.36, 0.78, 0.045]} />
        <meshStandardMaterial color="#b99666" metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.32, 0.74]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FloorGrid() {
  const tiles = useMemo(() => {
    const items = [];
    for (let x = -12; x <= 12; x += 2) {
      for (let z = -13; z <= 11; z += 2) {
        items.push([x, z]);
      }
    }
    return items;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, -1]} receiveShadow>
        <planeGeometry args={[27, 29]} />
        <meshStandardMaterial color="#c8bbaa" roughness={0.29} metalness={0.1} />
      </mesh>
      {tiles.map(([x, z]) => (
        <mesh key={`${x}-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.048, z - 1]}>
          <planeGeometry args={[1.96, 1.96]} />
          <meshStandardMaterial color={(x + z) % 4 === 0 ? "#d1c5b5" : "#c8bbaa"} roughness={0.34} metalness={0.06} />
        </mesh>
      ))}
    </group>
  );
}

function Mirror({ position, rotation = 0, reflect = false }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[1.55, 3.25, 0.12]} />
        <meshStandardMaterial color="#a98b63" metalness={0.68} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.65, 0.075]}>
        {reflect
          ? <planeGeometry args={[1.36, 3.02]} />
          : <boxGeometry args={[1.36, 3.02, 0.035]} />}
        {reflect
          ? <MeshReflectorMaterial blur={[200, 80]} resolution={192} mixBlur={0.8} mixStrength={0.72}
            mirror={0.82} color="#dce0db" metalness={0.14} roughness={0.18} depthScale={0.08} />
          : <meshPhysicalMaterial color="#a6b0aa" metalness={0.12} roughness={0.16} clearcoat={1} />}
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[1.7, 0.08, 0.42]} />
        <meshStandardMaterial color="#866b4c" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

function Bench({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[2.3, 0.3, 0.72]} />
        <meshStandardMaterial color="#826d5a" roughness={0.68} />
      </mesh>
      {[-0.83, 0.83].map((x) => (
        <mesh key={x} position={[x, 0.29, 0]} castShadow>
          <boxGeometry args={[0.075, 0.52, 0.58]} />
          <meshStandardMaterial color="#b0946d" metalness={0.48} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Room({ sections, selectedSection, onSelect, controlsRef }) {
  const cameraTarget = useRef(new THREE.Vector3(0, 1.25, -2));
  const cameraPosition = useRef(new THREE.Vector3(0, 2.5, 13));
  const transitioning = useRef(false);
  const controls = controlsRef;

  useEffect(() => {
    const section = sections[selectedSection];
    if (section) {
      cameraTarget.current.set(section.position[0], 1.15, section.position[1]);
      cameraPosition.current.set(section.position[0], 2.6, section.position[1] + 6.4);
      transitioning.current = true;
    }
  }, [sections, selectedSection]);

  useFrame(({ camera }, delta) => {
    if (!transitioning.current || !controls.current) return;
    camera.position.lerp(cameraPosition.current, 1 - Math.exp(-delta * 1.5));
    controls.current.target.lerp(cameraTarget.current, 1 - Math.exp(-delta * 1.5));
    controls.current.update();
    if (camera.position.distanceTo(cameraPosition.current) < 0.035
      && controls.current.target.distanceTo(cameraTarget.current) < 0.035) {
      transitioning.current = false;
    }
  });

  return (
    <>
      <color attach="background" args={["#d2c8b8"]} />
      <fog attach="fog" args={["#d2c8b8", 19, 39]} />
      <ambientLight intensity={0.72} />
      <hemisphereLight args={["#fff6e8", "#776450", 1.1]} />
      <directionalLight position={[0, 9, 8]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-7, 4.8, 2]} intensity={34} distance={13} color="#ffdfb4" />
      <pointLight position={[7, 4.8, -4]} intensity={32} distance={13} color="#ffe9cc" />
      <pointLight position={[0, 4.8, -11]} intensity={30} distance={12} color="#fff4e3" />

      <FloorGrid />
      <mesh position={[0, 3.2, -15]} receiveShadow>
        <boxGeometry args={[27, 6.5, 0.45]} />
        <meshStandardMaterial color="#e2d9cc" roughness={0.82} />
      </mesh>
      <mesh position={[-13.5, 3.2, -1]} receiveShadow>
        <boxGeometry args={[0.45, 6.5, 28]} />
        <meshStandardMaterial color="#ded4c6" roughness={0.82} />
      </mesh>
      <mesh position={[13.5, 3.2, -1]} receiveShadow>
        <boxGeometry args={[0.45, 6.5, 28]} />
        <meshStandardMaterial color="#ded4c6" roughness={0.82} />
      </mesh>
      <mesh position={[0, 6.48, -1]}>
        <boxGeometry args={[27, 0.18, 29]} />
        <meshStandardMaterial color="#eee8dd" roughness={0.86} />
      </mesh>

      {[-8, -2, 4, 10].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[-5.7, 3.05, 0]}>
            <boxGeometry args={[0.07, 6.1, 0.1]} />
            <meshStandardMaterial color="#b39770" metalness={0.35} roughness={0.42} />
          </mesh>
          <mesh position={[5.7, 3.05, 0]}>
            <boxGeometry args={[0.07, 6.1, 0.1]} />
            <meshStandardMaterial color="#b39770" metalness={0.35} roughness={0.42} />
          </mesh>
          <mesh position={[0, 6.08, 0]}>
            <boxGeometry args={[11.4, 0.07, 0.1]} />
            <meshStandardMaterial color="#b39770" metalness={0.35} roughness={0.42} />
          </mesh>
        </group>
      ))}

      <Mirror position={[-12.6, 0, -8]} rotation={Math.PI / 2} reflect />
      <Mirror position={[12.6, 0, -1]} rotation={-Math.PI / 2} />
      <Bench position={[0, 0, -5]} />

      {sections.map((section, index) => {
        const [x, z] = section.position;
        const sectionProducts = section.products;
        const mannequinProduct = sectionProducts.find((product) => ["apparel", "bottom", "dress"].includes(getProductKind(product)));
        const accessories = sectionProducts.filter((product) => getProductKind(product) === "accessory");
        return (
          <group key={section.key} position={[x, 0, z]}>
            <pointLight position={[0, 5.3, -1]} intensity={15} distance={8} color="#ffe7c6" />
            <mesh position={[0, 6.27, -1]}>
              <cylinderGeometry args={[0.24, 0.43, 0.18, 32]} />
              <meshStandardMaterial color="#f4ead8" emissive="#ffe8c7" emissiveIntensity={0.7} roughness={0.28} />
            </mesh>
            <mesh position={[0, 0.035, 0]} receiveShadow>
              <cylinderGeometry args={[4.15, 4.15, 0.06, 48]} />
              <meshStandardMaterial color={index % 2 ? "#c2b19b" : "#bca98f"} roughness={0.42} metalness={0.08} />
            </mesh>
            <mesh position={[0, 3.55, -2.35]}>
              <boxGeometry args={[6.6, 0.045, 0.06]} />
              <meshStandardMaterial color="#b99666" metalness={0.65} roughness={0.28} />
            </mesh>
            <SectionSign title={section.title} position={[0, 3.68, -2.32]} />
            <Rack products={sectionProducts} onSelect={onSelect} position={[0.95, 0.08, -0.8]} />
            {mannequinProduct && <Mannequin product={mannequinProduct} onSelect={onSelect} position={[-1.55, 0.48, 1.3]} />}
            {accessories.map((product, productIndex) => (
                <AccessoryDisplay key={product.id} product={product} onSelect={onSelect}
                  position={[-2.7 + (productIndex % 4) * 1.8, 0.12, 0.65 + Math.floor(productIndex / 4) * 1.35]} />
            ))}
            <Shelf product={sectionProducts[1] ?? mannequinProduct} position={[-3.35, 0.08, -1.2]} />
            <Shelf product={sectionProducts[2] ?? mannequinProduct} position={[3.35, 0.08, -1.2]} />
            {sectionProducts.slice(0, 3).map((product, productIndex) => (
              <ProductTag key={product.id} product={product} onSelect={onSelect}
                position={[-2 + productIndex * 2, 2.45, 1.4]} />
            ))}
          </group>
        );
      })}

      <ContactShadows position={[0, -0.035, 0]} opacity={0.28} scale={25} blur={2.2} far={8} resolution={256} />
      <OrbitControls ref={controls} makeDefault target={[0, 1.25, -2]} enableDamping dampingFactor={0.075}
        enablePan minDistance={4} maxDistance={21} minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 2.05} rotateSpeed={0.52} zoomSpeed={0.72} />
    </>
  );
}

function ModelPreview({ product, onSelect }) {
  const url = product.model_3d_url;
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const normalized = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 1.7 / Math.max(size.x, size.y, size.z, 1);
    scene.scale.setScalar(scale);
    const center = bounds.getCenter(new THREE.Vector3());
    scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    return scene;
  }, [scene]);
  return <primitive object={normalized} position={product.position}
    onClick={(event) => { event.stopPropagation(); onSelect(product); }} />;
}

export default function ShowroomScene({ products, sections, selectedSection, onSelect }) {
  const controlsRef = useRef(null);
  const modelProducts = products.flatMap((product) => {
    if (!product.model_3d_url) return [];
    const sectionIndex = sections.findIndex((section) => section.products.some((item) => item.id === product.id));
    if (sectionIndex < 0) return [];
    const section = sections[sectionIndex];
    const productIndex = section.products.findIndex((item) => item.id === product.id);
    const [x, z] = section.position;
    return [{ ...product, position: [x + 0.95 - 1.35 + productIndex * 0.68, 0.85, z - 0.5] }];
  });

  return (
    <div className={styles.sceneCanvas} aria-label="شوروم سه‌بعدی قابل گشت‌وگذار"
      data-lenis-prevent-wheel>
      <Canvas
        dpr={typeof window !== "undefined" && window.innerWidth < 760 ? 1 : [1, 1.35]}
        camera={{ position: [0, 2.5, 13], fov: 48, near: 0.1, far: 70 }}
        shadows={THREE.PCFShadowMap}
        gl={{ antialias: typeof window !== "undefined" && window.innerWidth >= 760, powerPreference: "high-performance", alpha: false }}
        fallback={<p className={styles.sceneFallback} role="alert">مرورگر شما امکان نمایش فضای سه‌بعدی را ندارد.</p>}
      >
        <Room sections={sections} selectedSection={selectedSection}
          onSelect={onSelect} controlsRef={controlsRef} />
        <Suspense fallback={null}>
          <CampaignModel />
          {modelProducts.map((product) => (
            <ModelPreview key={product.id} product={product} onSelect={onSelect} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
