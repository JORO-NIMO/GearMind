import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Smartphone,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Cpu,
  AlertTriangle,
} from "lucide-react";

// Types
interface VRScreenState {
  part?: string;
  solutions?: string[];
  tools?: string[];
  risk?: string;
}

// 3D Math Types
type Point3D = [number, number, number];
interface Face {
  indices: number[];
  color: string;
  outlineColor?: string;
}

// Custom 3D geometries generators
const createCube = (size: number, color: string, outlineColor?: string, offset: Point3D = [0, 0, 0]): { vertices: Point3D[]; faces: Face[] } => {
  const s = size / 2;
  const [ox, oy, oz] = offset;
  const vertices: Point3D[] = [
    [-s + ox, -s + oy, -s + oz], // 0
    [s + ox, -s + oy, -s + oz],  // 1
    [s + ox, s + oy, -s + oz],   // 2
    [-s + ox, s + oy, -s + oz],  // 3
    [-s + ox, -s + oy, s + oz],  // 4
    [s + ox, -s + oy, s + oz],   // 5
    [s + ox, s + oy, s + oz],    // 6
    [-s + ox, s + oy, s + oz],   // 7
  ];
  const faces: Face[] = [
    { indices: [0, 1, 2, 3], color, outlineColor }, // Front
    { indices: [1, 5, 6, 2], color, outlineColor }, // Right
    { indices: [5, 4, 7, 6], color, outlineColor }, // Back
    { indices: [4, 0, 3, 7], color, outlineColor }, // Left
    { indices: [3, 2, 6, 7], color, outlineColor }, // Top
    { indices: [4, 5, 1, 0], color, outlineColor }, // Bottom
  ];
  return { vertices, faces };
};

const createCylinder = (
  radiusBottom: number,
  radiusTop: number,
  height: number,
  segments: number,
  color: string,
  outlineColor?: string,
  offset: Point3D = [0, 0, 0],
  rotX = 0
): { vertices: Point3D[]; faces: Face[] } => {
  const vertices: Point3D[] = [];
  const faces: Face[] = [];
  const [ox, oy, oz] = offset;
  const hHalf = height / 2;

  // Generate vertices
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Bottom vertex
    const bx = cos * radiusBottom + ox;
    let by = -hHalf + oy;
    let bz = sin * radiusBottom + oz;

    // Top vertex
    const tx = cos * radiusTop + ox;
    let ty = hHalf + oy;
    let tz = sin * radiusTop + oz;

    // Apply rotation around X axis if specified
    if (rotX !== 0) {
      const cosR = Math.cos(rotX);
      const sinR = Math.sin(rotX);
      // Bottom rot
      const byRot = by * cosR - bz * sinR;
      const bzRot = by * sinR + bz * cosR;
      by = byRot;
      bz = bzRot;
      // Top rot
      const tyRot = ty * cosR - tz * sinR;
      const tzRot = ty * sinR + tz * cosR;
      ty = tyRot;
      tz = tzRot;
    }

    vertices.push([bx, by, bz]);
    vertices.push([tx, ty, tz]);
  }

  // Generate faces
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const b1 = i * 2;
    const t1 = i * 2 + 1;
    const b2 = next * 2;
    const t2 = next * 2 + 1;

    // Side face
    faces.push({
      indices: [b1, b2, t2, t1],
      color,
      outlineColor,
    });
  }

  // Cap faces
  const bottomCap: number[] = [];
  const topCap: number[] = [];
  for (let i = 0; i < segments; i++) {
    bottomCap.push(i * 2);
    topCap.push((segments - 1 - i) * 2 + 1);
  }
  faces.push({ indices: bottomCap, color, outlineColor });
  faces.push({ indices: topCap, color, outlineColor });

  return { vertices, faces };
};

// Generates an interactive 3D model of a part
const getPartModel = (
  partType: string,
  animationProgress: number,
  currentStep: number
): { vertices: Point3D[]; faces: Face[] } => {
  const normPart = partType.toLowerCase();

  if (normPart.includes("spark") || normPart.includes("plug")) {
    // 3D Spark Plug Model
    // Built of multiple cylinders stack
    const baseCylinder = createCylinder(0.8, 0.8, 1.2, 8, "#3b82f6", "#1d4ed8", [0, -1, 0]); // Metal body
    const ceramicInsulator = createCylinder(0.6, 0.5, 2.0, 8, "#ffffff", "#94a3b8", [0, 0.6, 0]); // White porcelain
    const metalHex = createCylinder(1.0, 1.0, 0.5, 6, "#64748b", "#334155", [0, -0.3, 0]); // Hex nut part
    const tipConnector = createCylinder(0.3, 0.3, 0.4, 6, "#e2e8f0", "#475569", [0, 1.8, 0]); // Top contact
    const electrode = createCylinder(0.2, 0.2, 0.5, 4, "#cbd5e1", "#475569", [0, -1.85, 0]); // Igniter pin

    // Animation: If step is unscrewing, rotate and lift
    let lift = 0;
    let rot = 0;
    if (currentStep === 0) {
      lift = animationProgress * 2.5;
      rot = animationProgress * Math.PI * 6; // spins 3 times as it unscrews
    } else if (currentStep > 0) {
      lift = 2.5; // already removed
    }

    const allVertices: Point3D[] = [];
    const allFaces: Face[] = [];

    const addModel = (model: { vertices: Point3D[]; faces: Face[] }) => {
      const vOffset = allVertices.length;
      model.vertices.forEach(([x, y, z]) => {
        // Apply animation transformation
        let rx = x;
        let ry = y;
        let rz = z;

        if (currentStep >= 0) {
          // Rotate around Y-axis for unscrewing
          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);
          rx = x * cosR - z * sinR;
          rz = x * sinR + z * cosR;
          // Lift
          ry = y + lift;
        }

        allVertices.push([rx, ry, rz]);
      });
      model.faces.forEach((f) => {
        allFaces.push({
          indices: f.indices.map((idx) => idx + vOffset),
          color: f.color,
          outlineColor: f.outlineColor,
        });
      });
    };

    addModel(baseCylinder);
    addModel(ceramicInsulator);
    addModel(metalHex);
    addModel(tipConnector);
    addModel(electrode);

    return { vertices: allVertices, faces: allFaces };
  } else if (normPart.includes("brake") || normPart.includes("disc") || normPart.includes("pad")) {
    // 3D Brake Disc Rotor & Caliper
    const rotorOuter = createCylinder(2.2, 2.2, 0.2, 12, "#475569", "#1e293b", [0, 0, 0]); // Main rotor
    const rotorHat = createCylinder(1.2, 1.1, 0.6, 10, "#94a3b8", "#475569", [0, 0, 0.3]); // Center hat

    // Caliper - slides away in step 1/2
    let caliperOffset = 0;
    if (currentStep === 0) {
      caliperOffset = animationProgress * 1.5;
    } else if (currentStep > 0) {
      caliperOffset = 1.5;
    }
    const caliper = createCube(1.2, "#ef4444", "#991b1b", [1.6 + caliperOffset, 0, 0.2]); // Red brake caliper

    const allVertices: Point3D[] = [];
    const allFaces: Face[] = [];

    const addModel = (model: { vertices: Point3D[]; faces: Face[] }) => {
      const vOffset = allVertices.length;
      model.vertices.forEach((v) => allVertices.push(v));
      model.faces.forEach((f) => {
        allFaces.push({
          indices: f.indices.map((idx) => idx + vOffset),
          color: f.color,
          outlineColor: f.outlineColor,
        });
      });
    };

    addModel(rotorOuter);
    addModel(rotorHat);
    addModel(caliper);

    return { vertices: allVertices, faces: allFaces };
  } else if (normPart.includes("battery") || normPart.includes("cable") || normPart.includes("terminal")) {
    // 3D Battery
    const body = createCube(2.4, "#1e293b", "#0f172a", [0, -0.4, 0]); // Main battery box
    const posCap = createCube(0.4, "#ef4444", "#991b1b", [-0.8, 0.7, 0]); // Red top
    const negCap = createCube(0.4, "#3b82f6", "#1d4ed8", [0.8, 0.7, 0]); // Blue top
    const termPos = createCylinder(0.2, 0.2, 0.4, 6, "#cbd5e1", "#475569", [-0.8, 1.0, 0]); // Pos terminal
    const termNeg = createCylinder(0.2, 0.2, 0.4, 6, "#cbd5e1", "#475569", [0.8, 1.0, 0]); // Neg terminal

    // Cables disconnect animation
    let cableLift = 0;
    if (currentStep === 0) {
      cableLift = animationProgress * 2.0;
    } else if (currentStep > 0) {
      cableLift = 2.0;
    }
    const cablePos = createCylinder(0.12, 0.12, 1.2, 6, "#ef4444", "#991b1b", [-0.8, 1.4 + cableLift, 0], Math.PI / 2); // Disconnecting Pos Cable

    const allVertices: Point3D[] = [];
    const allFaces: Face[] = [];

    const addModel = (model: { vertices: Point3D[]; faces: Face[] }) => {
      const vOffset = allVertices.length;
      model.vertices.forEach((v) => allVertices.push(v));
      model.faces.forEach((f) => {
        allFaces.push({
          indices: f.indices.map((idx) => idx + vOffset),
          color: f.color,
          outlineColor: f.outlineColor,
        });
      });
    };

    addModel(body);
    addModel(posCap);
    addModel(negCap);
    addModel(termPos);
    addModel(termNeg);
    addModel(cablePos);

    return { vertices: allVertices, faces: allFaces };
  } else {
    // 3D Engine Block (General Part)
    const block = createCube(2.0, "#475569", "#1e293b", [0, -0.5, 0]); // Main engine block block
    const manifoldLeft = createCube(0.8, "#64748b", "#334155", [-1.2, -0.3, 0]);
    const manifoldRight = createCube(0.8, "#64748b", "#334155", [1.2, -0.3, 0]);

    // Cylinder piston animation moving up and down
    const time = Date.now() * 0.005;
    const pistonHeight1 = Math.sin(time) * 0.4;
    const pistonHeight2 = Math.cos(time) * 0.4;

    const piston1 = createCylinder(0.4, 0.4, 0.6, 6, "#e2e8f0", "#64748b", [-0.5, 0.5 + pistonHeight1, 0]);
    const piston2 = createCylinder(0.4, 0.4, 0.6, 6, "#e2e8f0", "#64748b", [0.5, 0.5 + pistonHeight2, 0]);

    const allVertices: Point3D[] = [];
    const allFaces: Face[] = [];

    const addModel = (model: { vertices: Point3D[]; faces: Face[] }) => {
      const vOffset = allVertices.length;
      model.vertices.forEach((v) => allVertices.push(v));
      model.faces.forEach((f) => {
        allFaces.push({
          indices: f.indices.map((idx) => idx + vOffset),
          color: f.color,
          outlineColor: f.outlineColor,
        });
      });
    };

    addModel(block);
    addModel(manifoldLeft);
    addModel(manifoldRight);
    addModel(piston1);
    addModel(piston2);

    return { vertices: allVertices, faces: allFaces };
  }
};

// Generates 3D models for tools (e.g. Wrench)
const getToolModel = (
  toolType: string,
  animationProgress: number,
  currentStep: number,
  partType: string
): { vertices: Point3D[]; faces: Face[] } => {
  // Let's draw a beautiful Wrench
  const handle = createCube(2.2, "#cbd5e1", "#475569", [0, 0, 0]); // Long wrench metal handle
  const headOpen = createCylinder(0.5, 0.5, 0.25, 6, "#94a3b8", "#334155", [1.2, 0, 0]); // Hex key open end
  const headBox = createCylinder(0.45, 0.45, 0.25, 8, "#94a3b8", "#334155", [-1.2, 0, 0]); // Box end

  // Animate tool relative to step and part
  // The wrench floats above, then moves down, aligns with the part, spins, and moves back
  let tx = 0;
  let ty = 2.0; // Starts floating above
  let tz = 1.0;
  const rx = 0;
  let ry = 0;
  let rz = 0;

  const normPart = partType.toLowerCase();
  const isSparkPlug = normPart.includes("spark") || normPart.includes("plug");

  if (currentStep === 0 && animationProgress > 0) {
    if (isSparkPlug) {
      // Moves down to spark plug base, spins around Y axis to unscrew, then lifts
      if (animationProgress < 0.3) {
        // Moving down
        const p = animationProgress / 0.3;
        ty = 2.0 - p * 2.3; // moves down to Y = -0.3
        tx = 0;
        tz = 0;
        ry = Math.PI / 4;
      } else if (animationProgress < 0.8) {
        // Spinning to unscrew
        const p = (animationProgress - 0.3) / 0.5;
        ty = -0.3;
        tx = 0;
        tz = 0;
        ry = Math.PI / 4 + p * Math.PI * 6; // Spin!
      } else {
        // Lifting away
        const p = (animationProgress - 0.8) / 0.2;
        ty = -0.3 + p * 2.5;
        tx = p * 1.5;
        tz = p * 1.5;
        ry = Math.PI / 4;
      }
    } else {
      // Slide or clamp tool
      const p = animationProgress;
      ty = 2.0 - p * 1.5;
      tx = p * -0.5;
      rz = p * Math.PI * 0.2;
    }
  } else if (currentStep > 0) {
    // Already finished, tool sits on the side
    ty = 2.5;
    tx = 2.0;
    tz = 1.5;
  }

  const allVertices: Point3D[] = [];
  const allFaces: Face[] = [];

  const addModel = (model: { vertices: Point3D[]; faces: Face[] }) => {
    const vOffset = allVertices.length;
    model.vertices.forEach(([x, y, z]) => {
      // Apply rotation transformations
      let nx = x;
      let ny = y;
      let nz = z;

      // Rotate tool itself
      if (ry !== 0) {
        const cosR = Math.cos(ry);
        const sinR = Math.sin(ry);
        const rxVal = nx * cosR - nz * sinR;
        const rzVal = nx * sinR + nz * cosR;
        nx = rxVal;
        nz = rzVal;
      }
      if (rz !== 0) {
        const cosR = Math.cos(rz);
        const sinR = Math.sin(rz);
        const rxVal = nx * cosR - ny * sinR;
        const ryVal = nx * sinR + ny * cosR;
        nx = rxVal;
        ny = ryVal;
      }

      // Offset position
      allVertices.push([nx + tx, ny + ty, nz + tz]);
    });
    model.faces.forEach((f) => {
      allFaces.push({
        indices: f.indices.map((idx) => idx + vOffset),
        color: f.color,
        outlineColor: f.outlineColor,
      });
    });
  };

  addModel(handle);
  addModel(headOpen);
  addModel(headBox);

  return { vertices: allVertices, faces: allFaces };
};

const VRScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as VRScreenState) || {};

  // Retrieve or fallback values
  const part = state.part || "Engine Component";
  const solutions = state.solutions || [
    "Securely mount and align the part in its correct socket",
    "Tighten the fasteners to specified manufacturer torque levels",
    "Perform a visual inspection and dynamic system test to confirm fix",
  ];
  const tools = state.tools || ["Torque Wrench", "Socket Set", "Safety Glasses"];
  const risk = state.risk || "Medium";

  // State
  const [vrMode, setVrMode] = useState<boolean>(false); // Stereoscopic split-screen mode
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animationProgress, setAnimationProgress] = useState<number>(0);

  // Rotation angles for camera controls (touch / mouse drag)
  const [angleX, setAngleX] = useState<number>(-0.3); // Slight tilt down
  const [angleY, setAngleY] = useState<number>(0.5);  // Slight angle side

  // Gaze / Fuse interaction variables for VR Mode
  const [gazeTarget, setGazeTarget] = useState<string | null>(null);
  const [gazeProgress, setGazeProgress] = useState<number>(0); // 0 to 100%

  // Refs for 3D Drawing
  const canvasRef3D = useRef<HTMLCanvasElement | null>(null);
  const canvasRefVRL = useRef<HTMLCanvasElement | null>(null);
  const canvasRefVRR = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);
  const previousTouch = useRef<{ x: number; y: number } | null>(null);

  // Auto-cycle animation progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setAnimationProgress((prev) => {
          const next = prev + 0.008;
          return next > 1 ? 0 : next; // Reset loop
        });
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle VR mode gaze-based button click actions
  const handleVRGazeClick = (action: string) => {
    if (action === "next") {
      setCurrentStep((prev) => (prev < solutions.length - 1 ? prev + 1 : 0));
      setAnimationProgress(0);
    } else if (action === "prev") {
      setCurrentStep((prev) => (prev > 0 ? prev - 1 : solutions.length - 1));
      setAnimationProgress(0);
    } else if (action === "playpause") {
      setIsPlaying((prev) => !prev);
    } else if (action === "exit") {
      setVrMode(false);
    }
  };

  // VR Gaze Progress ticks
  useEffect(() => {
    if (!vrMode || !gazeTarget) {
      setGazeProgress(0);
      return;
    }

    const start = Date.now();
    const duration = 1200; // 1.2 seconds to complete fuse click

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setGazeProgress(progress);

      if (progress >= 100) {
        clearInterval(timer);
        setGazeTarget(null);
        setGazeProgress(0);
        handleVRGazeClick(gazeTarget);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [vrMode, gazeTarget]);

  // Touch and Mouse handlers for camera rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    previousTouch.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !previousTouch.current) return;
    const dx = e.clientX - previousTouch.current.x;
    const dy = e.clientY - previousTouch.current.y;

    setAngleY((prev) => prev + dx * 0.01);
    setAngleX((prev) => Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev + dy * 0.01)));

    previousTouch.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
    previousTouch.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      previousTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !previousTouch.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - previousTouch.current.x;
    const dy = e.touches[0].clientY - previousTouch.current.y;

    setAngleY((prev) => prev + dx * 0.01);
    setAngleX((prev) => Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev + dy * 0.01)));

    previousTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    previousTouch.current = null;
  };

  // Render logic for 3D viewport
  const renderScene = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    eyeOffset: number = 0 // Offset for Stereoscopic VR depth
  ) => {
    // Clear canvas
    ctx.fillStyle = "#0f172a"; // Deep space background
    ctx.fillRect(0, 0, width, height);

    // Draw tech grids
    ctx.strokeStyle = "rgba(59, 130, 246, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Load geometry (Part & Tool models)
    const partGeom = getPartModel(part, animationProgress, currentStep);
    const toolGeom = getToolModel(tools[0] || "Wrench", animationProgress, currentStep, part);

    // Merge models
    const vertices: Point3D[] = [...partGeom.vertices, ...toolGeom.vertices];
    const faces: Face[] = [];

    partGeom.faces.forEach((f) => faces.push(f));
    const vOffset = partGeom.vertices.length;
    toolGeom.faces.forEach((f) => {
      faces.push({
        indices: f.indices.map((idx) => idx + vOffset),
        color: f.color,
        outlineColor: f.outlineColor,
      });
    });

    // Projection Setup
    const centerX = width / 2;
    const centerY = height / 2;
    const fov = Math.min(width, height) * 0.8; // Perspective scaling factor
    const cameraDist = 6.5; // Z offset to prevent division-by-zero

    // Rotate and Project vertices
    const projected: { x: number; y: number; z: number }[] = [];

    // Combine manual rotations and camera eye separation for Stereoscopic VR depth
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);

    vertices.forEach(([vx, vy, vz]) => {
      // 1. Rotate Y
      let rx1 = vx * cosY - vz * sinY;
      const rz1 = vx * sinY + vz * cosY;

      // 2. Rotate X
      const ry2 = vy * cosX - rz1 * sinX;
      const rz2 = vy * sinX + rz1 * cosX;

      // 3. Apply eye shift for stereoscopic VR
      rx1 += eyeOffset;

      // 4. Perspective Projection Math
      const zDepth = rz2 + cameraDist;
      if (zDepth <= 0.1) {
        projected.push({ x: centerX, y: centerY, z: 0 });
        return;
      }

      const px = centerX + (rx1 * fov) / zDepth;
      const py = centerY + (ry2 * fov) / zDepth;

      projected.push({ x: px, y: py, z: zDepth });
    });

    // Depth Sorting (Painter's Algorithm) to avoid occlusion clipping
    const facesWithDepth = faces.map((face, index) => {
      // average depth of face vertices
      let avgZ = 0;
      face.indices.forEach((idx) => {
        avgZ += projected[idx]?.z || 0;
      });
      avgZ /= face.indices.length;
      return { face, avgZ, index };
    });

    facesWithDepth.sort((a, b) => b.avgZ - a.avgZ); // Sort back to front

    // Draw depth-sorted 3D polygons
    facesWithDepth.forEach(({ face }) => {
      ctx.beginPath();
      const firstIdx = face.indices[0];
      if (!projected[firstIdx]) return;
      ctx.moveTo(projected[firstIdx].x, projected[firstIdx].y);

      for (let i = 1; i < face.indices.length; i++) {
        const idx = face.indices[i];
        if (!projected[idx]) continue;
        ctx.lineTo(projected[idx].x, projected[idx].y);
      }
      ctx.closePath();

      // Flat shading calculation (simulated directional ambient light)
      ctx.fillStyle = face.color;
      ctx.fill();

      // Stroke outline
      ctx.strokeStyle = face.outlineColor || "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw VR central crosshair and gaze fuse indicator if in VR Mode
    if (vrMode) {
      const size = 10;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      ctx.stroke();

      // Fuse circular progress bar
      if (gazeTarget && gazeProgress > 0) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size + 4, -Math.PI / 2, -Math.PI / 2 + (gazeProgress / 100) * Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  // Update loop for animations & draws
  const drawLoop = () => {
    if (vrMode) {
      if (canvasRefVRL.current && canvasRefVRR.current) {
        const cL = canvasRefVRL.current;
        const cR = canvasRefVRR.current;

        // Dynamic high-performance resize synchronization
        if (cL.width !== cL.clientWidth || cL.height !== cL.clientHeight) {
          cL.width = cL.clientWidth || 200;
          cL.height = cL.clientHeight || 300;
        }
        if (cR.width !== cR.clientWidth || cR.height !== cR.clientHeight) {
          cR.width = cR.clientWidth || 200;
          cR.height = cR.clientHeight || 300;
        }

        const ctxL = cL.getContext("2d");
        const ctxR = cR.getContext("2d");

        if (ctxL && ctxR) {
          // Stereoscopic Eye offsets (-0.18 for left eye, +0.18 for right eye)
          renderScene(ctxL, cL.width, cL.height, -0.18);
          renderScene(ctxR, cR.width, cR.height, 0.18);
        }
      }
    } else {
      if (canvasRef3D.current) {
        const canvas = canvasRef3D.current;

        // Dynamic high-performance resize synchronization
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
          canvas.width = canvas.clientWidth || 400;
          canvas.height = canvas.clientHeight || 400;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          renderScene(ctx, canvas.width, canvas.height);
        }
      }
    }

    requestRef.current = requestAnimationFrame(drawLoop);
  };

  // Manage animation loop starting/stopping
  useEffect(() => {
    requestRef.current = requestAnimationFrame(drawLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [vrMode, angleX, angleY, animationProgress, currentStep, gazeTarget, gazeProgress]);

  // Adjust canvas sizes to display properly in responsive layouts
  const resizeCanvases = () => {
    if (canvasRef3D.current) {
      const c = canvasRef3D.current;
      c.width = c.parentElement?.clientWidth || 400;
      c.height = c.parentElement?.clientHeight || 400;
    }
    if (canvasRefVRL.current && canvasRefVRR.current) {
      const cL = canvasRefVRL.current;
      const cR = canvasRefVRR.current;
      cL.width = cL.parentElement?.clientWidth || 200;
      cL.height = cL.parentElement?.clientHeight || 300;
      cR.width = cR.parentElement?.clientWidth || 200;
      cR.height = cR.parentElement?.clientHeight || 300;
    }
  };

  useEffect(() => {
    resizeCanvases();
    window.addEventListener("resize", resizeCanvases);
    return () => window.removeEventListener("resize", resizeCanvases);
  }, [vrMode]);

  // Handle VR Mode simulation gaze targeting based on simulated areas
  // In a cardboard or phone setup, rotating the device (or dragging here) moves the center crosshair.
  // We simulate gaze collision boxes. If crosshair (center) hovers near top left/right bounds, trigger target.
  useEffect(() => {
    if (!vrMode) return;

    // Map angleY & angleX to gaze targets
    // For simplicity, we trigger targets when angles align to certain quadrants
    if (angleY > 1.2 && angleY < 2.0 && angleX > -0.2 && angleX < 0.2) {
      if (gazeTarget !== "next") setGazeTarget("next");
    } else if (angleY < -1.2 && angleY > -2.0 && angleX > -0.2 && angleX < 0.2) {
      if (gazeTarget !== "prev") setGazeTarget("prev");
    } else if (angleX > 0.6 && angleY > -0.4 && angleY < 0.4) {
      if (gazeTarget !== "playpause") setGazeTarget("playpause");
    } else if (angleX < -0.6 && angleY > -0.4 && angleY < 0.4) {
      if (gazeTarget !== "exit") setGazeTarget("exit");
    } else {
      if (gazeTarget !== null) setGazeTarget(null);
    }
  }, [angleX, angleY, vrMode]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden max-w-lg mx-auto relative">
      {/* Top Header */}
      {!vrMode && (
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/60 backdrop-blur">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-sm font-semibold font-display truncate max-w-[200px]">
            VR: {part}
          </span>
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Interactive 3D/VR Workspace */}
      <div
        className={`flex-1 relative flex overflow-hidden ${
          vrMode ? "flex-row bg-slate-950" : "flex-col"
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* VR Split-Screen Layout */}
        {vrMode ? (
          <div className="fixed inset-0 z-50 bg-slate-950 flex w-screen h-screen divide-x divide-slate-800">
            {/* Left Eye */}
            <div className="flex-1 h-full relative overflow-hidden">
              <canvas ref={canvasRefVRL} className="w-full h-full block" />
              {/* Left Eye HUD Overlay */}
              <div className="absolute top-4 left-4 right-4 pointer-events-none text-white/80 font-mono text-[9px] bg-slate-900/60 p-2 rounded border border-white/5">
                <p className="font-bold text-sky-400">GEARMIND VR ASSIST</p>
                <p className="truncate">PART: {part}</p>
                <p className="text-emerald-400 font-bold uppercase mt-1">STEP {currentStep + 1}/{solutions.length}</p>
                <p className="line-clamp-2 mt-0.5">{solutions[currentStep]}</p>
              </div>

              {/* Floating VR instructions on gaze buttons */}
              <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-between text-[8px] text-white/50 font-mono">
                <span>Stare Left: PREV STEP</span>
                <span>Stare Right: NEXT STEP</span>
              </div>
            </div>

            {/* Right Eye */}
            <div className="flex-1 h-full relative overflow-hidden">
              <canvas ref={canvasRefVRR} className="w-full h-full block" />
              {/* Right Eye HUD Overlay */}
              <div className="absolute top-4 left-4 right-4 pointer-events-none text-white/80 font-mono text-[9px] bg-slate-900/60 p-2 rounded border border-white/5">
                <p className="font-bold text-sky-400">GEARMIND VR ASSIST</p>
                <p className="truncate">PART: {part}</p>
                <p className="text-emerald-400 font-bold uppercase mt-1">STEP {currentStep + 1}/{solutions.length}</p>
                <p className="line-clamp-2 mt-0.5">{solutions[currentStep]}</p>
              </div>

              {/* VR Controls Guide inside right eye */}
              <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-between text-[8px] text-white/50 font-mono">
                <span>Stare Up: PLAY/PAUSE</span>
                <span>Stare Down: EXIT VR</span>
              </div>
            </div>

            {/* Floating Indicator for VR target */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
              {gazeTarget && (
                <div className="bg-red-600/90 text-white text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full shadow border border-red-500 animate-pulse">
                  Targeting: {gazeTarget} ({Math.round(gazeProgress)}%)
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal 3D Immersive Viewport */
          <div className="flex-1 w-full h-full relative bg-slate-950">
            <canvas ref={canvasRef3D} className="w-full h-full block cursor-grab active:cursor-grabbing" />

            {/* Float HUD on 3D View */}
            <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-700/50 backdrop-blur p-3.5 rounded-xl pointer-events-none max-w-[280px]">
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                Interactive 3D Simulation
              </span>
              <h4 className="text-base font-semibold text-white capitalize mt-0.5">{part}</h4>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tools.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-700/30"
                  >
                    <Wrench className="w-2.5 h-2.5 text-sky-400" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Rotation help notice */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono pointer-events-none">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Drag to Rotate • Touch to Rotate</span>
            </div>

            {/* Action Buttons to Enter VR or Reset Camera */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  setAngleX(-0.3);
                  setAngleY(0.5);
                }}
                className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white"
                title="Reset Camera"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setVrMode(true)}
                className="h-10 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 shadow-lg"
                title="Enter VR Headset Mode"
              >
                <Eye className="w-5 h-5" />
                VR Mode
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Repair Step-by-Step Guidance Bar (Not shown in VR Mode) */}
      {!vrMode && (
        <div className="bg-card border-t border-border p-5">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 mb-4">
            {solutions.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "bg-primary w-6"
                    : i < currentStep
                    ? "bg-sky-500/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step Detail */}
          <div className="mb-5 min-h-[90px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-bold uppercase text-primary">
                Step {currentStep + 1} of {solutions.length}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  risk === "High"
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : risk === "Medium"
                    ? "bg-warning/10 text-warning border-warning/20"
                    : "bg-success/10 text-success border-success/20"
                }`}
              >
                {risk} Risk
              </span>
            </div>
            <p className="text-sm text-foreground font-medium leading-relaxed">
              {solutions[currentStep]}
            </p>
          </div>

          {/* Stepper controls */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setCurrentStep((prev) => (prev > 0 ? prev - 1 : solutions.length - 1));
                setAnimationProgress(0);
              }}
              className="h-12 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center text-sm font-medium"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Prev
            </button>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className={`h-12 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-sm transition-all ${
                isPlaying
                  ? "bg-muted text-foreground border border-border"
                  : "bg-sky-600 text-white"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause Anim
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Play Anim
                </>
              )}
            </button>

            <button
              onClick={() => {
                setCurrentStep((prev) => (prev < solutions.length - 1 ? prev + 1 : 0));
                setAnimationProgress(0);
              }}
              className="h-12 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center text-sm font-semibold shadow-md"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VRScreen;
