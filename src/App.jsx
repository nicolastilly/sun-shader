// App.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { shaderMaterial, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';
import SplitTextAnimation from './SplitTextAnimation';

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
        
        // Ajuster la taille de l'effet selon la valeur demandée
        float mouseDist = length(mouseUv) * 0.5; // Valeur ajustée selon votre préférence
        
        // Mouse interaction: zone d'influence avec la taille souhaitée
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

  // Fonction pour normaliser la position (souris ou tactile)
  const updatePosition = (clientX, clientY) => {
    const x = clientX / window.innerWidth;
    const y = 1 - clientY / window.innerHeight; // Inverser Y pour correspondre aux coordonnées GLSL
    setMousePosition([x, y]);
  };

  // Gestion des événements de souris et tactiles
  useEffect(() => {
    // Gestionnaire d'événements de souris
    const handleMouseMove = (e) => {
      updatePosition(e.clientX, e.clientY);
    };

    // Gestionnaire d'événements tactiles
    const handleTouchMove = (e) => {
      // Prévenir le défilement et les autres comportements par défaut
      e.preventDefault();

      // Utiliser le premier point de contact
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updatePosition(touch.clientX, touch.clientY);
      }
    };

    // Ajouter les écouteurs d'événements
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Support tactile pour le démarrage d'un toucher
    window.addEventListener('touchstart', handleTouchMove, { passive: false });

    // Nettoyage
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
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
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showIntro, setShowIntro] = useState(true);

  // Suivre la position du curseur pour le curseur personnalisé
  useEffect(() => {
    const updateCursorPosition = (clientX, clientY) => {
      setCursorPosition({ x: clientX, y: clientY });
    };

    const handleMouseMove = (e) => {
      updateCursorPosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updateCursorPosition(touch.clientX, touch.clientY);
      }
    };

    // Ajouter les écouteurs d'événements
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchstart', handleTouchMove);

    // Masquer l'intro après un certain délai
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 20000); // Masquer après 7 secondes (ajuster selon la durée souhaitée)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      clearTimeout(timer);
    };
  }, []);

  // Détecter si l'appareil est tactile
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Vérifier si l'appareil supporte le tactile
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkTouchDevice();
  }, []);

  return (
    <div className="App">
      {/* Animation de texte d'introduction */}
      {showIntro && (
        <SplitTextAnimation text="A black sun in a sunny day" />
      )}

      {/* Curseur personnalisé (uniquement affiché sur les appareils non tactiles) */}
      {!isTouchDevice && (
        <div
          className="custom-cursor"
          style={{ left: `${cursorPosition.x}px`, top: `${cursorPosition.y}px` }}
        />
      )}

      <Canvas>
        {/* Utiliser une caméra orthographique pour un affichage 2D parfait */}
        <OrthographicCamera makeDefault position={[0, 0, 5]} />
        <FullScreenQuad />
      </Canvas>
    </div>
  );
}

export default App;