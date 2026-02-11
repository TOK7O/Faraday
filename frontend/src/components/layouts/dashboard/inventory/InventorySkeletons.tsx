import React from "react";
import { Spinner } from "@components/ui/Spinner";

export const RackSkeleton = () => {
  return (
    <div
      className="glass-card"
      style={{
        padding: "1.5rem",
        height: "220px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255, 255, 255, 0.02)",
      }}
    >
      <Spinner size={32} color="var(--text-muted)" />
    </div>
  );
};

export const ProductSkeleton = () => {
  return (
    <div
      className="glass-card"
      style={{
        padding: "1.2rem",
        display: "flex",
        gap: "1.2rem",
        alignItems: "center",
        height: "100px",
        background: "rgba(255, 255, 255, 0.02)",
      }}
    >
      <div
        style={{
          width: "50px",
          height: "50px",
          background: "var(--bg-input)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner size={20} color="var(--text-muted)" />
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "60%",
            height: "12px",
            background: "var(--bg-input)",
            borderRadius: "4px",
          }}
        ></div>
        <div
          style={{
            width: "40%",
            height: "10px",
            background: "var(--bg-input)",
            borderRadius: "4px",
          }}
        ></div>
      </div>
    </div>
  );
};

export const ProductListSkeleton = () => {
  return (
    <tr style={{ opacity: 0.7 }}>
      <td colSpan={7} style={{ padding: "1rem", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            alignItems: "center",
          }}
        >
          <Spinner size={16} color="var(--text-muted)" />
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            Loading item...
          </span>
        </div>
      </td>
    </tr>
  );
};

export const SkeletonGrid = ({
  count,
  type,
}: {
  count: number;
  type: "rack" | "product";
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>
          {type === "rack" ? <RackSkeleton /> : <ProductSkeleton />}
        </React.Fragment>
      ))}
    </>
  );
};
