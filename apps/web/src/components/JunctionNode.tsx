import { Handle, Position } from "@xyflow/react";

// Invisible anchor point sitting at the midpoint between two parents (on their marriage line),
// so their children's descent lines start from "the middle of father and mother" instead of
// fanning out from each parent separately.
export function JunctionNode() {
  return (
    <div style={{ width: 1, height: 1 }}>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1, border: "none" }} />
    </div>
  );
}
