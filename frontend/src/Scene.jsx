// src/Scene.jsx
import React, { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useThree, useFrame, Canvas } from '@react-three/fiber'; 
import * as THREE from 'three';
import { Model } from './Model';
import { OrbitControls, Stats, Html, Line } from '@react-three/drei';

// --- NEW: DIMENSIONS COMPONENT ---
// --- UPDATED: 3D ROOM DIMENSIONS ---
const Dimensions = ({ selectedObject }) => {
  const [dimensions, setDimensions] = useState(null);
  const [labelPosition, setLabelPosition] = useState([0, 0, 0]);

  // Object Measurement Logic (Same as before)
  useFrame(() => {
    if (selectedObject) {
      const box = new THREE.Box3().setFromObject(selectedObject);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const newDims = `${size.x.toFixed(2)}m × ${size.y.toFixed(2)}m × ${size.z.toFixed(2)}m`;
      
      if (dimensions !== newDims) setDimensions(newDims);
      setLabelPosition([center.x, box.max.y + 0.2, center.z]);
    } else {
      if (dimensions) setDimensions(null);
    }
  });

  // Room Constants
  const ROOM_SIZE = 9.7;
  const ROOM_HEIGHT = 10
  ; // Standard ceiling height
  const HALF = ROOM_SIZE / 2;
  const COLOR = "#444"; // Subtle grey lines

  return (
    <group>
      {/* 1. FLOOR GRID (Base) */}
      <group position={[0, 0.01, 0]}>
        <gridHelper args={[ROOM_SIZE, ROOM_SIZE, 0x555555, 0x222222]} />
      </group>

      {/* 2. 3D ROOM BOUNDARIES (The "Box") */}
      <group>
        {/* Vertical Corner Posts (Height) */}
        <Line points={[[-HALF, 0, -HALF], [-HALF, ROOM_HEIGHT, -HALF]]} color={COLOR} lineWidth={1} />
        <Line points={[[HALF, 0, -HALF], [HALF, ROOM_HEIGHT, -HALF]]} color={COLOR} lineWidth={1} />
        <Line points={[[-HALF, 0, HALF], [-HALF, ROOM_HEIGHT, HALF]]} color={COLOR} lineWidth={1} />
        <Line points={[[HALF, 0, HALF], [HALF, ROOM_HEIGHT, HALF]]} color={COLOR} lineWidth={1} />

        {/* Ceiling Outline (Top) */}
        <Line points={[[-HALF, ROOM_HEIGHT, -HALF], [HALF, ROOM_HEIGHT, -HALF]]} color={COLOR} lineWidth={1} />
        <Line points={[[-HALF, ROOM_HEIGHT, HALF], [HALF, ROOM_HEIGHT, HALF]]} color={COLOR} lineWidth={1} />
        <Line points={[[-HALF, ROOM_HEIGHT, -HALF], [-HALF, ROOM_HEIGHT, HALF]]} color={COLOR} lineWidth={1} />
        <Line points={[[HALF, ROOM_HEIGHT, -HALF], [HALF, ROOM_HEIGHT, HALF]]} color={COLOR} lineWidth={1} />
      </group>

      {/* 3. DIMENSION LABELS (X, Y, Z) */}
      
      {/* Width (X-Axis) */}
      <Html position={[0, 0, HALF + 0.2]} center transform sprite>
        <div className="room-label">WIDTH: {ROOM_SIZE}m</div>
      </Html>

      {/* Depth (Z-Axis) */}
      <Html position={[HALF + 0.2, 0, 0]} center transform sprite>
        <div className="room-label" style={{ transform: 'rotate(90deg)' }}>LENGTH: {ROOM_SIZE}m</div>
      </Html>

      {/* Height (Y-Axis) */}
      <Html position={[-HALF - 0.2, ROOM_HEIGHT / 2, -HALF]} center transform sprite>
        <div className="room-label">HEIGHT: {ROOM_HEIGHT}m</div>
      </Html>

      {/* 4. SELECTED OBJECT TAG (Preserved) */}
      {selectedObject && dimensions && (
        <Html position={labelPosition} center>
          <div className="dimension-tag" style={{ color: 'red', fontWeight: 'bold' }}>
            {dimensions}
          </div>
        </Html>
      )}
    </group>
  );
};

// --- EXISTING: SceneCapture Helper ---
const SceneCapture = forwardRef((props, ref) => {
  const { gl, scene, camera } = useThree();

  useImperativeHandle(ref, () => ({
    capture: () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/jpeg', 0.5);
    },
    // New floor position logic for drag-and-drop
    getFloorPosition: (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      return target ? [target.x, 0, target.z] : [0, 0, 0];
    }
  }));
  return null;
});

// --- EXISTING: ShadowAuraAnalysis Component ---
const ShadowAuraAnalysis = ({ enabled, models }) => {
    const { scene, size } = useThree();
    const planeRef = useRef();
    const materialRef = useRef();
    const lightsRef = useRef([]);
    
    // Advanced shader with shadow casting
    const shadowShaderMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            lightPositions: { value: new Array(6).fill().map(() => new THREE.Vector3()) },
            lightIntensities: { value: new Array(6).fill(0) },
            lightCount: { value: 0 },
            roomSize: { value: 8.0 },
            resolution: { value: new THREE.Vector2(size.width, size.height) },
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            
            void main() {
                vUv = uv;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 lightPositions[6];
            uniform float lightIntensities[6];
            uniform int lightCount;
            uniform float roomSize;
            uniform vec2 resolution;
            uniform float time;
            
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            
            vec3 professionalHeatmap(float intensity) {
                if (intensity < 0.05) return vec3(0.0, 0.0, 0.4);
                else if (intensity < 0.15) return vec3(0.0, 0.3, 0.8);
                else if (intensity < 0.3) return vec3(0.0, 0.6, 0.7);
                else if (intensity < 0.45) return vec3(0.0, 0.8, 0.4);
                else if (intensity < 0.6) return vec3(0.4, 0.9, 0.2);
                else if (intensity < 0.75) return vec3(0.9, 0.9, 0.0);
                else if (intensity < 0.9) return vec3(1.0, 0.5, 0.0);
                else return vec3(1.0, 0.0, 0.0);
            }
            
            float smoothFalloff(float distance, float radius) {
                float d = distance / radius;
                float d2 = d * d;
                float d4 = d2 * d2;
                return clamp(1.0 - d4, 0.0, 1.0);
            }
            
            float calculateShadowEffect(vec3 worldPos, vec3 lightPos, float lightIntensity) {
                vec3 lightToPoint = worldPos - lightPos;
                float distanceToLight = length(lightToPoint);
                
                float shadow = 1.0;
                
                if (distanceToLight > 3.0) {
                    float shadowFactor = (distanceToLight - 3.0) / 7.0;
                    shadow = 1.0 - shadowFactor * 0.7;
                }
                
                float noise = fract(sin(dot(worldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
                shadow *= (0.9 + noise * 0.2);
                
                return clamp(shadow, 0.3, 1.0);
            }
            
            void main() {
                vec3 worldPos = vec3(vWorldPosition.x, 0.0, vWorldPosition.z);
                float totalIntensity = 0.0;
                
                for (int i = 0; i < 6; i++) {
                    if (i >= lightCount) break;
                    
                    vec3 lightPos = lightPositions[i];
                    lightPos.y = 0.0;
                    
                    vec3 toLight = lightPos - worldPos;
                    float distance = length(toLight);
                    
                    if (distance < 12.0) {
                        float attenuation = 1.0 / (0.2 + distance * distance * 0.08);
                        float shadow = calculateShadowEffect(worldPos, lightPos, lightIntensities[i]);
                        
                        vec3 lightDir = normalize(toLight);
                        float directional = 1.0 - abs(lightDir.y) * 0.5;
                        
                        float intensity = lightIntensities[i] * attenuation * directional * shadow;
                        totalIntensity += intensity;
                    }
                }
                
                totalIntensity += 0.03;
                totalIntensity = clamp(totalIntensity, 0.0, 1.0);
                totalIntensity = pow(totalIntensity, 0.7);
                
                vec3 color = professionalHeatmap(totalIntensity);
                
                vec2 grid = abs(fract(vUv * 12.0 - 0.5) - 0.5);
                float gridLine = smoothstep(0.08, 0.03, max(grid.x, grid.y));
                color = mix(color, color * 0.8, gridLine * 0.4);
                
                gl_FragColor = vec4(color, 0.9);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    }), [size.width, size.height]);

    const updateSceneData = () => {
        const lights = [];
        
        scene.traverse((child) => {
            if (child.isLight) {
                const worldPosition = new THREE.Vector3();
                child.getWorldPosition(worldPosition);
                lights.push({
                    position: worldPosition,
                    intensity: child.intensity / 25.0
                });
            }
        });
        
        lightsRef.current = lights;
        return { lights };
    };

    useEffect(() => {
        if (!enabled) {
            if (planeRef.current) {
                while (planeRef.current.children.length > 0) {
                    planeRef.current.remove(planeRef.current.children[0]);
                }
            }
            return;
        }

        console.log("🎨 Starting Realistic Shadow Analysis");
        
        const { lights } = updateSceneData();

        const geometry = new THREE.PlaneGeometry(16, 16, 150, 150);
        const plane = new THREE.Mesh(geometry, shadowShaderMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0.15;
        
        materialRef.current = shadowShaderMaterial;
        
        if (planeRef.current) {
            planeRef.current.add(plane);
        }

        return () => {
            if (planeRef.current) {
                while (planeRef.current.children.length > 0) {
                    const child = planeRef.current.children[0];
                    planeRef.current.remove(child);
                    if (child.geometry) child.geometry.dispose();
                }
            }
        };
    }, [enabled, scene, shadowShaderMaterial]);

    useFrame((state) => {
        if (!enabled || !materialRef.current) return;

        const { lights } = updateSceneData();
        
        const positions = [];
        const intensities = [];
        
        lights.forEach((light, i) => {
            if (i < 6) {
                positions[i] = light.position;
                intensities[i] = light.intensity;
            }
        });
        
        for (let i = lights.length; i < 6; i++) {
            positions[i] = new THREE.Vector3(1000, 1000, 1000);
            intensities[i] = 0.0;
        }
        
        materialRef.current.uniforms.lightPositions.value = positions;
        materialRef.current.uniforms.lightIntensities.value = intensities;
        materialRef.current.uniforms.lightCount.value = lights.length;
        materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
        materialRef.current.uniformsNeedUpdate = true;
    });

    return <group ref={planeRef} />;
};

// Safe TransformControls component
const SafeTransformControls = ({ object, mode, onMouseUp }) => {
  const TransformControls = React.lazy(() => 
    import('@react-three/drei').then(module => ({ 
      default: module.TransformControls 
    }))
  );

  if (!object || !object.isObject3D) {
    return null;
  }

  return (
    <React.Suspense fallback={null}>
      <TransformControls 
        object={object} 
        mode={mode} 
        onMouseUp={onMouseUp}
      />
    </React.Suspense>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Failed to load 3D model:", error);
  }
  render() {
    if (this.state.hasError) return null; 
    return this.props.children;
  }
}

// --- MAIN SCENE COMPONENT ---
// Now using forwardRef to allow the parent (Create.jsx) to call functions inside here
export const Scene = forwardRef(({ 
  models = [], 
  selectionTarget, // Used for remote selection
  transformMode, 
  selectedObject, 
  setSelectedObject, 
  onTransformEnd, 
  lightIntensity,
  auraAnalysisEnabled = false 
}, ref) => {
  
  const handleMouseUp = () => {
    if (selectedObject && onTransformEnd) {
      try {
        onTransformEnd(
          selectedObject.userData?.instanceId,
          [selectedObject.position.x, selectedObject.position.y, selectedObject.position.z],
          [selectedObject.rotation.x, selectedObject.rotation.y, selectedObject.rotation.z],
          selectedObject.scale.x
        );
      } catch (error) {
        console.error('Error in transform end:', error);
      }
    }
  };

  return (
    <Canvas 
      shadows 
      camera={{ position: [0, 1.5, 4] }}
      onPointerMissed={() => !auraAnalysisEnabled && setSelectedObject(null)}
      // IMPORTANT: preserveDrawingBuffer must be TRUE for screenshots to work!
      gl={{
        preserveDrawingBuffer: true, 
        powerPreference: "high-performance",
        antialias: false,
        alpha: false
      }}
      dpr={1}
    >
      {/* --- ADD STATS FOR FPS MONITORING --- */}
      <Stats className="fps-stats" />

      {/* Attach the capture logic using the ref passed from Create.jsx */}
      <SceneCapture ref={ref} />

      {/* --- ADD DIMENSIONS HERE --- */}
      <Dimensions selectedObject={selectedObject} />

      <hemisphereLight skyColor={0x78909c} groundColor={0x455a64} intensity={0.8} />
      <directionalLight castShadow position={[0, 3, 2]} intensity={1.5} />
      
      <OrbitControls makeDefault enabled={!selectedObject || auraAnalysisEnabled} />

      {/* Safe TransformControls - only show when not in Aura mode */}
      {selectedObject && !auraAnalysisEnabled && (
        <SafeTransformControls 
          object={selectedObject} 
          mode={transformMode} 
          onMouseUp={handleMouseUp}
        />
      )}
      
      <React.Suspense fallback={null}>
       {models.map((modelData) => (
          <ErrorBoundary key={modelData.instanceId}>
            <Model
              modelData={modelData}
              selectionTarget={selectionTarget} 
              setSelectedObject={setSelectedObject}
              lightIntensity={lightIntensity}
            />
          </ErrorBoundary>
        ))}
      </React.Suspense>

      {/* Shadow Aura Analysis */}
      {auraAnalysisEnabled && <ShadowAuraAnalysis enabled={auraAnalysisEnabled} models={models} />}
    </Canvas>
  );
});