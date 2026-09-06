import { BaseEdge, getStraightPath, type EdgeProps } from "@xyflow/react";

export interface SpouseEdgeData {
  isConsanguineous?: boolean;
  highlighted?: boolean;
  [key: string]: unknown;
}

export function SpouseEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps & { data?: SpouseEdgeData }) {
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const stroke = data?.highlighted ? "#ffd23f" : "#555";
  const strokeWidth = data?.highlighted ? 4 : 2;

  if (data?.isConsanguineous) {
    const dx = targetY - sourceY;
    const dy = -(targetX - sourceX);
    const len = Math.hypot(dx, dy) || 1;
    const offset = 3;
    const ox = (dx / len) * offset;
    const oy = (dy / len) * offset;
    const [path1] = getStraightPath({
      sourceX: sourceX + ox,
      sourceY: sourceY + oy,
      targetX: targetX + ox,
      targetY: targetY + oy,
    });
    const [path2] = getStraightPath({
      sourceX: sourceX - ox,
      sourceY: sourceY - oy,
      targetX: targetX - ox,
      targetY: targetY - oy,
    });
    return (
      <>
        <BaseEdge path={path1} style={{ stroke, strokeWidth }} />
        <BaseEdge path={path2} style={{ stroke, strokeWidth }} />
      </>
    );
  }

  return <BaseEdge path={path} style={{ stroke, strokeWidth }} />;
}
