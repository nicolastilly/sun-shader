// App.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { shaderMaterial, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

// Définition du matériau de shader
const SunMaterial = shaderMaterial(
  {
    u_time: 0,
    u_mouse: new THREE.Vector2(0.5, 0.5),
    u_resolution: new THREE.Vector2(800, 600),
  },
  // Vertex shader
  `
    varying vec2 v_uv;
    
    void main() {
      v_uv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader (votre shader)
  `
    precision mediump float;

    uniform float u_time;
    uniform vec2 u_mouse;
    uniform vec2 u_resolution;
    varying vec2 v_uv;
    
    // Bayer 4x4 dithering matrix
    float dither4x4(vec2 uv) {
        int x = int(mod(uv.x, 4.0));
        int y = int(mod(uv.y, 4.0));
        int index = x + y * 4;
        float dither[16] = float[16](
            0.0,  8.0,  2.0, 10.0,
            12.0, 4.0, 14.0,  6.0,
            3.0, 11.0,  1.0,  9.0,
            15.0, 7.0, 13.0,  5.0
        );
        return dither[index] / 16.0;
    }
    
    void main() {
        // Coordonnées UV normalisées et ajustées pour le ratio d'aspect (pour le soleil)
        vec2 uv = v_uv * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;
    
        // Sun radius with slight pulsing
        float radius = 0.5 + 0.03 * sin(u_time);
        
        // Distance from center
        float dist = length(uv);
        
        // Dithering effect
        float dither = dither4x4(gl_FragCoord.xy);
        
        // Black and white sun with dithering
        float sun = step(radius - dither * 0.09, dist);
        
        // Coordonnées pour l'effet de souris (centrées sur la souris)
        vec2 mouseUv = v_uv - u_mouse;
        // Appliquer le même ratio d'aspect que l'écran pour corriger la forme
        float aspectRatio = u_resolution.x / u_resolution.y;
        mouseUv.x *= aspectRatio;
        
        // Réduire la taille de l'effet et rendre le cercle plus prononcé
        float mouseDist = length(mouseUv) * 0.5; // Multiplier pour réduire la taille
        
        // Mouse interaction: zone d'influence plus petite et plus prononcée
        sun += smoothstep(0.1, 0.2, 0.3 - mouseDist);
        
        gl_FragColor = vec4(vec3(sun), 1.0);
    }
  `
);

// Enregistrement du matériau personnalisé pour pouvoir l'utiliser dans JSX
extend({ SunMaterial });

// Composant pour adapter le shader à l'écran
function FullScreenQuad() {
  const { viewport } = useThree();
  
  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <SunShaderMaterial />
    </mesh>
  );
}

// Composant pour le matériau du shader
function SunShaderMaterial() {
  const materialRef = useRef();
  const { size } = useThree();
  const [mousePosition, setMousePosition] = useState([0.5, 0.5]);
  
  // Mise à jour du temps dans le shader
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.getElapsedTime();
    }
  });
  
  // Mise à jour de la résolution lors du changement de taille
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_resolution.value.set(size.width, size.height);
    }
  }, [size]);
  
  // Gestion des événements de souris
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = 1 - e.clientY / window.innerHeight; // Inverser Y pour correspondre aux coordonnées GLSL
      setMousePosition([x, y]);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Mise à jour de la position de la souris dans le shader
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_mouse.value.set(mousePosition[0], mousePosition[1]);
    }
  }, [mousePosition]);
  
  return <sunMaterial ref={materialRef} />;
}

// Composant de l'application
function App() {
  return (
    <div className="App">
      <Canvas>
        {/* Utiliser une caméra orthographique pour un affichage 2D parfait */}
        <OrthographicCamera makeDefault position={[0, 0, 5]} />
        <FullScreenQuad />
      </Canvas>
    </div>
  );
}

export default App;