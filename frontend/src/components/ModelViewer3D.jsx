import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import '../styles/ModelViewer3D.css';

const debugLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const debugWarn = (...args) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};

const debugError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

function disposeObject3D(root) {
  root.traverse((obj) => {
    if (obj.geometry) {
      obj.geometry.dispose();
    }

    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((material) => {
        if (!material) return;

        Object.values(material).forEach((value) => {
          if (value && typeof value === 'object' && typeof value.dispose === 'function') {
            value.dispose();
          }
        });

        material.dispose?.();
      });
    }
  });
}

// Simple test geometry as fallback
function TestModel() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ff6b6b" />
    </mesh>
  );
}

function Model({ url, onLoadComplete, onError }) {
  const group = useRef();

  try {
    // Use useGLTF hook - this is the modern React way
    const gltf = useGLTF(url);
    
    useEffect(() => {
      let clonedScene = null;

      if (gltf.scene && group.current) {
        debugLog('✓ Model loaded successfully');
        
        // Clone the scene to avoid reuse issues
        clonedScene = gltf.scene.clone(true);
        
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(clonedScene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        debugLog('📐 Model bounds:', {
          center: { x: center.x, y: center.y, z: center.z }, 
          size: { x: size.x, y: size.y, z: size.z } 
        });

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 2 / maxDim : 1;

        clonedScene.scale.multiplyScalar(scale);
        clonedScene.position.set(
          -center.x * scale,
          (-center.y * scale) - 0.5,
          -center.z * scale
        );

        // Clear group and add cloned scene
        group.current.clear();
        group.current.add(clonedScene);

        debugLog('✓ Model positioned and scaled successfully');
        if (onLoadComplete) onLoadComplete();
      }

      return () => {
        if (clonedScene) {
          disposeObject3D(clonedScene);
        }
        if (group.current) {
          group.current.clear();
        }
      };
    }, [gltf, onLoadComplete]);

    return <group ref={group} />;
  } catch (error) {
    debugError('❌ Error loading model:', error);
    if (onError) onError(error);
    return <TestModel />;
  }
}

function ModelViewer3D({ modelPath }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTest, setShowTest] = useState(false);

  const handleModelLoad = () => {
    debugLog('✅ Model loaded successfully');
    setIsLoading(false);
    setError(null);
  };

  const handleModelError = (err) => {
    debugError('❌ Model error:', err);
    setError(err.message || 'Failed to load model');
    setIsLoading(false);
  };

  const handleCanvasReady = () => {
    debugLog('✓ Canvas initialized');
    
    // Timeout to hide loading screen
    const timeout = setTimeout(() => {
      if (isLoading) {
        debugWarn('⏱️ Timeout: hiding loading screen');
        setIsLoading(false);
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  };

  return (
    <div className="model-viewer-container">
      {isLoading && !error && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading 3D Model...</p>
          <small style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
            {modelPath}
          </small>
        </div>
      )}
      {error && (
        <div className="error-overlay">
          <p className="error-message">⚠️ Error Loading Model</p>
          <small>{error}</small>
          <small style={{ marginTop: '8px', display: 'block' }}>Path: {modelPath}</small>
          <button 
            onClick={() => setShowTest(!showTest)}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showTest ? 'Show Error' : 'Show Test Model'}
          </button>
        </div>
      )}
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}
        onCreated={handleCanvasReady}
      >
        {/* Lights */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 7]} intensity={1.2} />
        <directionalLight position={[-5, -5, -3]} intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />

        {/* Model */}
        <React.Suspense fallback={<TestModel />}>
          {!error || showTest ? (
            <Model 
              url={modelPath} 
              onLoadComplete={handleModelLoad}
              onError={handleModelError}
            />
          ) : (
            <TestModel />
          )}
        </React.Suspense>

        {/* Controls */}
        <OrbitControls
          autoRotate={true}
          autoRotateSpeed={2}
          enableZoom={true}
          enablePan={true}
          minDistance={0.5}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}

export default ModelViewer3D;
