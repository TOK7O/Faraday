import React, { Suspense, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Stars,
  Float,
  Text,
  Edges,
  Bounds,
  useBounds,
} from "@react-three/drei";
import {
  Box,
  MousePointer2,
  Loader2,
} from "lucide-react";
import { getRacks, getFullInventoryList } from "@/api/axios";
import type {
  Rack,
  FullInventoryItem,
} from "@/components/layouts/dashboard/inventory/InventoryContent.types";
import { useTranslation } from "@/context/LanguageContext";

const Rack3D = ({
  position,
  rack,
  items,
}: {
  position: [number, number, number];
  rack: Rack;
  items: FullInventoryItem[];
}) => {
  const [hovered, setHover] = useState(false);
  const api = useBounds();

  const { code, m: rows, n: columns } = rack;
  const shelfWidth = columns * 1.4;
  const shelfHeight = 1.2;

  const handleClick = (e: any) => {
    e.stopPropagation();
    api.refresh(e.object).fit();
  };

  return (
    <group
      position={position}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      onClick={handleClick}
    >
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          position={[shelfWidth / 2, rows * shelfHeight + 0.6, 0]}
          fontSize={0.35}
          color={hovered ? "#ffffff" : "#00f3ff"}
        >
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
      {[...Array(rows)].map((_, rIndex) => {
        const rowItems = items.filter((item) => item.slotY === rIndex + 1);

        return (
          <group key={`r-${rIndex}`} position={[0, rIndex * shelfHeight, 0]}>
            <mesh position={[shelfWidth / 2, 0, 0]}>
              <boxGeometry args={[shelfWidth, 0.05, 1]} />
              <meshStandardMaterial color="#27272a" transparent opacity={0.9} />
              <Edges color="#3f3f46" />
            </mesh>

            {/* Paczki pobrane z bazy */}
            {rowItems.map((item) => (
              <mesh
                key={`item-${item.itemId}`}
                position={[(item.slotX - 1) * 1.4 + 0.7, 0.4, 0]}
              >
                <boxGeometry args={[0.85, 0.65, 0.85]} />
                <meshStandardMaterial color={hovered ? "#00f3ff" : "#3f3f46"} />
                <Edges color="#ffffff" transparent opacity={0.3} />
                {hovered && (
                  <Text position={[0, 0.6, 0.5]} fontSize={0.15} color="white">
                    {item.productName}
                  </Text>
                )}
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

const OverviewContent = () => {
  const { t } = useTranslation();
  const [racks, setRacks] = useState<Rack[]>([]);
  const [inventory, setInventory] = useState<FullInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [racksData, inventoryData] = await Promise.all([
        getRacks(),
        getFullInventoryList(),
      ]);

      setRacks(
        racksData.map((r: any) => ({
          id: r.id,
          code: r.code,
          m: r.rows,
          n: r.columns,
          tempMin: r.minTemperature,
          tempMax: r.maxTemperature,
          maxWeight: r.maxWeightKg,
          maxWidth: r.maxItemWidthMm,
          maxHeight: r.maxItemHeightMm,
          maxDepth: r.maxItemDepthMm,
          comment: r.comment,
        })),
      );

      setInventory(inventoryData);
    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const spacingZ = 12;
  const spacingX = 14;
  const bufferX = 4;

  // Obliczanie pozycji regałów w siatce z uwzględnieniem ich szerokości
  const rackElements = useMemo(() => {
    const itemsPerRow = 2;
    const elements: React.JSX.Element[] = [];

    let currentX = 0;

    racks.forEach((rack, index) => {
      const col = index % itemsPerRow;
      const row = Math.floor(index / itemsPerRow);

      const rackWidth = rack.n * 1.4;

      if (col === 0) {
        currentX = 0;
      }

      const xPos = currentX;
      const zPos = -row * spacingZ;

      currentX += rackWidth + bufferX;

      const rackItems = inventory.filter((item) => item.rackCode === rack.code);

      elements.push(
        <Rack3D
          key={rack.id}
          position={[xPos, 0, zPos]}
          rack={rack}
          items={rackItems}
        />,
      );
    });

    return elements;
  }, [racks, inventory, spacingZ, bufferX]);

  return (
    <div className="dashboard-content">
      <div className="bento-dashboard">
        <div
          className="bento-card"
          style={{
            gridColumn: "span 2",
            gridRow: "span 2",
            minHeight: "550px",
            padding: 0,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: "1.5rem",
              right: "1.5rem",
              zIndex: 10,
              pointerEvents: "none",
              textAlign: "right",
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "0.7rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <MousePointer2 size={12} /> {t.dashboardPage.content.overview.interactive.controls}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: "1.8rem",
              left: "1.8rem",
              zIndex: 10,
            }}
          >
            <div className="card-header" style={{ color: "white" }}>
              <Box size={14} /> {t.dashboardPage.content.overview.interactive.title}
            </div>
            {isLoading && (
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.8rem",
                }}
              >
                <Loader2 size={12} className="animate-spin" /> {t.dashboardPage.content.overview.interactive.fetching}
              </div>
            )}
          </div>

          <div style={{ width: "100%", height: "100%", background: "#050505" }}>
            <Canvas shadows dpr={[1, 2]}>
              <Suspense fallback={null}>
                <PerspectiveCamera
                  makeDefault
                  position={[15, 12, 15]}
                  fov={40}
                />

                <OrbitControls
                  makeDefault
                  enableDamping={true}
                  dampingFactor={0.05}
                  maxPolarAngle={Math.PI / 2.1}
                  minDistance={5}
                  maxDistance={50}
                />

                <ambientLight intensity={0.7} />
                <pointLight
                  position={[10, 10, 10]}
                  intensity={1.5}
                  color="#00f3ff"
                />

                <Stars
                  radius={50}
                  depth={50}
                  count={3000}
                  factor={4}
                  saturation={0}
                  fade
                  speed={1}
                />

                <Bounds fit clip observe margin={1.2}>
                  <group position={[-spacingX / 2, 0, 0]}>{rackElements}</group>
                </Bounds>

                <gridHelper
                  args={[100, 100, "#27272a", "#111111"]}
                  position={[0, -0.01, 0]}
                />
              </Suspense>
            </Canvas>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewContent;
