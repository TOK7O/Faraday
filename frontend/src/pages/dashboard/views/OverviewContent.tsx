import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars, Float, Text, Edges, Bounds, useBounds } from "@react-three/drei";
import { Activity, ShieldCheck, Box, MousePointer2 } from "lucide-react";

const Rack3D = ({ position, code, rows = 3, columns = 4 }: { position: [number, number, number], code: string, rows?: number, columns?: number }) => {
    const [hovered, setHover] = useState(false);
    const api = useBounds(); // Pozwala na automatyczne centrowanie kamery po kliknięciu

    const shelfWidth = columns * 1.4;
    const shelfHeight = 1.2;

    const handleClick = (e: any) => {
        e.stopPropagation();
        api.refresh(e.object).fit(); // Przybliża kamerę do klikniętego obiektu
    };

    return (
        <group
            position={position}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
            onClick={handleClick}
        >
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <Text position={[shelfWidth / 2, rows * shelfHeight + 0.6, 0]} fontSize={0.35} color={hovered ? "#ffffff" : "#00f3ff"}>
                    {code}
                </Text>
            </Float>

            {/* Konstrukcja pionowa */}
            {[0, shelfWidth].map((x, i) => (
                <mesh key={`p-${i}`} position={[x, (rows * shelfHeight) / 2, 0]}>
                    <boxGeometry args={[0.15, rows * shelfHeight, 0.15]} />
                    <meshStandardMaterial color={hovered ? "#2d2d30" : "#1a1a1a"} />
                    <Edges color={hovered ? "#00f3ff" : "#3f3f46"} />
                </mesh>
            ))}

            {/* Półki */}
            {[...Array(rows)].map((_, r) => (
                <group key={`r-${r}`} position={[0, r * shelfHeight, 0]}>
                    <mesh position={[shelfWidth / 2, 0, 0]}>
                        <boxGeometry args={[shelfWidth, 0.05, 1]} />
                        <meshStandardMaterial color="#27272a" transparent opacity={0.9} />
                        <Edges color="#3f3f46" />
                    </mesh>

                    {/* Paczki */}
                    {[...Array(columns)].map((_, c) => (
                        (r + c) % 2 === 0 && (
                            <mesh key={`b-${r}-${c}`} position={[c * 1.4 + 0.7, 0.4, 0]}>
                                <boxGeometry args={[0.85, 0.65, 0.85]} />
                                <meshStandardMaterial color={hovered ? "#71717a" : "#3f3f46"} />
                                <Edges color="#ffffff" transparent opacity={0.1} />
                            </mesh>
                        )
                    ))}
                </group>
            ))}
        </group>
    );
};

const OverviewContent = () => {
    return (
        <div className="dashboard-content">
            <div className="bento-dashboard">

                <div className="bento-card">
                    <div className="card-header"><Activity size={14} /> System Load</div>
                    <h2>Optimal</h2>
                </div>

                {/* GŁÓWNA KARTA 3D */}
                <div className="bento-card" style={{ gridColumn: "span 2", gridRow: "span 2", minHeight: "550px", padding: 0, overflow: "hidden", position: "relative" }}>

                    {/* Instrukcja obsługi nakładana na UI */}
                    <div style={{ position: "absolute", bottom: "1.5rem", right: "1.5rem", zIndex: 10, pointerEvents: "none", textAlign: "right" }}>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                            <MousePointer2 size={12} /> Click rack to focus • Scroll to zoom • Drag to rotate
                        </div>
                    </div>

                    <div style={{ position: "absolute", top: "1.8rem", left: "1.8rem", zIndex: 10 }}>
                        <div className="card-header" style={{ color: "white" }}>
                            <Box size={14} /> Interactive Warehouse
                        </div>
                    </div>

                    <div style={{ width: "100%", height: "100%", background: "#050505" }}>
                        <Canvas shadows dpr={[1, 2]}>
                            <Suspense fallback={null}>
                                <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={40} />

                                {/* Ustawienia sterowania: płynne i ograniczone */}
                                <OrbitControls
                                    makeDefault
                                    enableDamping={true}
                                    dampingFactor={0.05}
                                    maxPolarAngle={Math.PI / 2.1} // Blokada widoku "od dołu"
                                    minDistance={5}  // Minimalny zoom
                                    maxDistance={30} // Maksymalny zoom
                                />

                                <ambientLight intensity={0.7} />
                                <pointLight position={[10, 10, 10]} intensity={1.5} color="#00f3ff" />

                                <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

                                {/* Bounds pozwala na automatyczne wyśrodkowanie kamery na obiekcie */}
                                <Bounds fit clip observe margin={1.2}>
                                    <group position={[-4, 0, 2]}>
                                        <Rack3D position={[0, 0, 0]} code="ZONE-A1" rows={4} columns={4} />
                                        <Rack3D position={[0, 0, -6]} code="ZONE-B2" rows={3} columns={5} />
                                        <Rack3D position={[8, 0, -3]} code="ZONE-C3" rows={4} columns={3} />
                                    </group>
                                </Bounds>

                                <gridHelper args={[50, 50, "#27272a", "#111111"]} position={[0, 0, 0]} />
                            </Suspense>
                        </Canvas>
                    </div>
                </div>

                <div className="bento-card accent">
                    <div className="card-header"><ShieldCheck size={14} /> Security Status</div>
                    <h2>Verified</h2>
                </div>

            </div>
        </div>
    );
};

export default OverviewContent;