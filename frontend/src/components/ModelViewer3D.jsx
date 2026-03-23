import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import '../styles/ModelViewer3D.css';

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
  const modelRef = useRef();
  const hasLoaded = useRef(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('🔄 Attempting to load model from:', url);
        
        // Check if file exists
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`File not found: ${response.status} ${response.statusText}`);
        }
        console.log('✓ File exists, loading with THREE...');

        // Load using THREE
        const loader = new THREE.GLTFLoader();
        loader.load(
          url,
          (gltf) => {
            console.log('✓ GLB loaded successfully:', gltf);
            
            if (hasLoaded.current) return;
            hasLoaded.current = true;

            const scene = gltf.scene;

            try {
              // Center and scale the model
              const box = new THREE.Box3().setFromObject(scene);
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());

              console.log('📐 Model bounds:', { center, size });

              const maxDim = Math.max(size.x, size.y, size.z);
              const scale = maxDim > 0 ? 2 / maxDim : 1;

              scene.scale.multiplyScalar(scale);
              scene.position.set(
                -center.x * scale,
                (-center.y * scale) - 0.5,
                -center.z * scale
              );

              if (modelRef.current) {
                while (modelRef.current.children.length > 0) {
                  modelRef.current.removeChild(modelRef.current.children[0]);
                }
                modelRef.current.add(scene);
              }

              console.log('✓ Model positioned successfully');
              setTimeout(() => {
                if (onLoadComplete) onLoadComplete();
              }, 300);
            } catch (err) {
              console.error('❌ Error positioning model:', err);
              if (onError) onError(err);
            }
          },
          (progress) => {
            console.log('📊 Loading progress:', Math.round((progress.loaded / progress.total) * 100) + '%');
          },
          (error) => {
            console.error('❌ GLTFLoader error:', error);
            setLoadError(error.message);
            if (onError) onError(error);
          }
        );
      } catch (err) {
        console.error('❌ Model fetch error:', err);
        setLoadError(err.message);
        if (onError) onError(err);
      }
    };

    if (!hasLoaded.current) {
      loadModel();
    }
  }, [url, onLoadComplete, onError]);

  if (loadError) {
    return null;
  }

  return <group ref={modelRef} />;
}

function ModelViewer3D({ modelPath }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTest, setShowTest] = useState(false);

  const handleModelLoad = () => {
    console.log('✅ Model loaded successfully');
    setIsLoading(false);
    setError(null);
  };

  const handleModelError = (err) => {
    console.error('❌ Model error:', err);
    setError(err.message || 'Failed to load model');
    setIsLoading(false);
  };

  const handleCanvasReady = (state) => {
    console.log('✓ Canvas initialized');
    
    // Timeout to hide loading screen
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⏱️ Timeout: hiding loading screen');
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
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
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
