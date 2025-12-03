// src/SceneCapture.jsx

import { useFBO } from '@react-three/drei';
import { useFrame, createPortal } from '@react-three/fiber';
import { Scene as ThreeScene, OrthographicCamera, MeshBasicMaterial } from 'three';
import { useMemo } from 'react';

// This component renders its children to an off-screen texture
export function SceneCapture({ children }) {
  // Create an off-screen canvas (Framebuffer Object)
  const fbo = useFBO(1024, 1024);
  // Create a new Three.js scene to render our blueprint
  const blueprintScene = useMemo(() => new ThreeScene(), []);
  // Create a top-down camera
  const camera = useMemo(() => new OrthographicCamera(-8, 8, 8, -8, 0.1, 100), []);
  // A simple white material to render silhouettes
  const overrideMaterial = useMemo(() => new MeshBasicMaterial({ color: 'white' }), []);
  
  // Position the camera to look straight down from above
  camera.position.set(0, 10, 0);
  camera.lookAt(0, 0, 0);

  useFrame((state) => {
    // On every frame, we do the following:
    // 1. Temporarily set the render target to our off-screen FBO
    state.gl.setRenderTarget(fbo);
    // 2. Set a black background
    state.gl.setClearColor('#000000');
    state.gl.clear();
    // 3. Set the override material for a clean silhouette look
    blueprintScene.overrideMaterial = overrideMaterial;
    // 4. Render our blueprint scene with the top-down camera
    state.gl.render(blueprintScene, camera);
    // 5. Unset the override material and render target to go back to normal
    blueprintScene.overrideMaterial = null;
    state.gl.setRenderTarget(null);
  });

  // createPortal allows us to render our models into the separate blueprintScene
  return (
    <>
      {createPortal(children, blueprintScene)}
      {/* This returns the texture from our off-screen canvas */}
      <primitive object={fbo.texture} />
    </>
  );
}