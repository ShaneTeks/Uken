import React, { useState, useEffect, useRef } from 'react';

// This is a helper component to define custom animations.
// The blob animations are removed as we now use JS for animation.
const CustomStyles = () => (
  <style>{`
    @keyframes indeterminate-bar {
      0% { left: -40%; }
      100% { left: 100%; }
    }
    .animate-indeterminate-bar {
      animation: indeterminate-bar 2s infinite ease-in-out;
    }
  `}</style>
);

// Custom hook for the bouncing orb animation logic
const useBouncingOrbs = (containerRef: React.RefObject<HTMLDivElement | null>) => {
    const [orbs, setOrbs] = useState<any[]>([]);
    const animationFrameId = useRef<number | null>(null);

    // Initialize orbs on mount
    useEffect(() => {
        const initialOrbs = [
            { id: 1, color: 'bg-purple-600', size: 300, x: 50, y: 100, vx: 1.5, vy: 1 },
            { id: 2, color: 'bg-sky-400', size: 400, x: 200, y: 300, vx: -1, vy: 1.2 },
            { id: 3, color: 'bg-pink-500', size: 250, x: 400, y: 150, vx: 1, vy: -1.5 },
        ];
        setOrbs(initialOrbs);
    }, []);

    // Animation loop
    useEffect(() => {
        const animate = () => {
            if (!containerRef.current) {
                animationFrameId.current = requestAnimationFrame(animate);
                return;
            };

            const { clientWidth, clientHeight } = containerRef.current;

            setOrbs(prevOrbs => 
                prevOrbs.map(orb => {
                    let newX = orb.x + orb.vx;
                    let newY = orb.y + orb.vy;
                    let newVx = orb.vx;
                    let newVy = orb.vy;

                    // Bounce off horizontal walls
                    if (newX <= 0 || newX + orb.size >= clientWidth) {
                        newVx *= -1;
                        newX = newX <= 0 ? 0 : clientWidth - orb.size; // Clamp position
                    }
                    // Bounce off vertical walls
                    if (newY <= 0 || newY + orb.size >= clientHeight) {
                        newVy *= -1;
                        newY = newY <= 0 ? 0 : clientHeight - orb.size; // Clamp position
                    }
                    
                    return { ...orb, x: newX, y: newY, vx: newVx, vy: newVy };
                })
            );
            
            animationFrameId.current = requestAnimationFrame(animate);
        };

        animationFrameId.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [containerRef]);

    return orbs;
};


// The 16:9 Frosted Glass Loading Screen Component
function LoadingScreen({ imageUrl }: { imageUrl: string }) {
  const loadingSteps = ['Rigging model...','Processing virtual world...','Building shaders...','Rendering frames...','Finalizing animation...'];
  const [currentStep, setCurrentStep] = useState(0);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const orbs = useBouncingOrbs(backgroundRef);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % loadingSteps.length);
    }, 2000);
    return () => clearInterval(stepInterval);
  }, [loadingSteps.length]);


  return (
    <div className="w-full h-full">
      <CustomStyles />
      <div className="relative aspect-[16/9] w-full h-full bg-gray-900 rounded-2xl shadow-2xl flex flex-col items-center justify-center overflow-hidden border border-gray-700">
        
        <div ref={backgroundRef} className="absolute inset-0">
          {/* === Background Lights Start === */}
          {orbs.map(orb => (
              <div 
                  key={orb.id}
                  className={`absolute rounded-full filter blur-3xl opacity-40 ${orb.color}`}
                  style={{
                      width: `${orb.size}px`,
                      height: `${orb.size}px`,
                      transform: `translate(${orb.x}px, ${orb.y}px)`,
                      transition: 'transform 0.05s linear' // Smooth out the movement slightly
                  }}
              />
          ))}
          {/* === Background Lights End === */}
        </div>

        {/* === Frosted Glass Layer Start === */}
        <div className="absolute inset-0 w-full h-full">
            <img 
                src={imageUrl} 
                alt="Source for diffusion"
                className="absolute inset-0 w-full h-full object-cover opacity-20"
                onError={(e: any) => { e.target.onerror = null; e.target.src='https://placehold.co/1920x1080/333/fff?text=Error'; }}
            />
            <div className="absolute inset-0 w-full h-full backdrop-blur-xl bg-black/10"></div>
        </div>
        {/* === Frosted Glass Layer End === */}

        {/* === Foreground Content Start === */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center p-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white" style={{textShadow: '0 2px 15px rgba(0,0,0,0.5)'}}>Animating</h1>
          <p className="text-gray-200 mb-8 text-lg min-h-[28px]" style={{textShadow: '0 1px 5px rgba(0,0,0,0.5)'}}>{loadingSteps[currentStep]}</p>
          <div className="w-3/4 max-w-md">
            <div className="w-full bg-white/10 rounded-full h-3 shadow-inner backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 h-full w-2/5 bg-gradient-to-r from-sky-400 to-purple-500 rounded-full animate-indeterminate-bar"></div>
            </div>
          </div>
        </div>
        {/* === Foreground Content End === */}
      </div>
    </div>
  );
}

export default LoadingScreen;
