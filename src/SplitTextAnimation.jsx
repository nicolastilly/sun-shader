import React, { useEffect, useRef } from 'react';
import './SplitTextAnimation.css';

const SplitTextAnimation = ({ text }) => {
  const textRef = useRef(null);

  useEffect(() => {
    // Assurer que le composant est monté
    if (!textRef.current) return;

    // Obtenir tous les spans (lettres) pour l'animation
    const letters = textRef.current.querySelectorAll('.letter');
    
    // Ajouter la classe d'animation à chaque lettre avec un délai croissant
    letters.forEach((letter, index) => {
      setTimeout(() => {
        letter.classList.add('animate');
      }, 100 * index); // 100ms de délai entre chaque lettre
    });
  }, []);

  // Diviser le texte en lettres individuelles
  const renderSplitText = () => {
    return text.split('').map((char, index) => (
      <span 
        key={index} 
        className="letter"
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <div className="split-text-container">
      <div ref={textRef} className="split-text">
        {renderSplitText()}
      </div>
    </div>
  );
};

export default SplitTextAnimation;