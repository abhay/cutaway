import { describe, expect, test } from "bun:test";
import { cylinderPose, boxerSpec } from "../site/hardware/boxer-scene.mjs";

describe("piston-engine geometry", () => {
  test("boxer keeps rods rigid and pistons within their bores through the complete cycle", () => {
    const spec = boxerSpec();
    for (const cylinder of spec.cylinders) {
      for (let angle = 0; angle <= 720; angle += 7) {
        const pose = cylinderPose(spec, cylinder, angle);
        const rodLength = Math.hypot(...pose.wristpin.map((value, i) => value - pose.crankpin[i]));
        expect(rodLength).toBeCloseTo(84, 9);
        expect(pose.distance).toBeGreaterThanOrEqual(60 - 1e-9);
        expect(pose.distance).toBeLessThanOrEqual(108 + 1e-9);
        expect(pose.wristpin[1]).toBe(cylinder.y);
        const nextTurn = cylinderPose(spec, cylinder, angle + 360);
        expect(nextTurn.distance).toBeCloseTo(pose.distance, 9);
      }
    }
  });

  test("boxer pairs move symmetrically on separate opposing crankpins", () => {
    const spec = boxerSpec();
    for (let angle = 0; angle < 360; angle += 11) {
      for (let station = 0; station < 2; station++) {
        const pair = spec.cylinders.filter((cylinder) => cylinder.station === station).map((cylinder) => cylinderPose(spec, cylinder, angle));
        expect(pair[0].distance).toBeCloseTo(pair[1].distance, 10);
        expect(pair[0].wristpin[0]).toBeCloseTo(-pair[1].wristpin[0], 10);
        expect(pair[0].crankpin[0]).toBeCloseTo(-pair[1].crankpin[0], 10);
        expect(pair[0].crankpin[2] - spec.crankZ).toBeCloseTo(-(pair[1].crankpin[2] - spec.crankZ), 10);
        expect(pair[0].crankpin[1]).not.toBe(pair[1].crankpin[1]);
      }
    }
  });
});
