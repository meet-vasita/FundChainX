import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import '../styles/LandingPage.css';

const ARC_DATA = [
  // Original arcs
  {
    startLat: 40.7128, // New York
    startLng: -74.0060,
    endLat: 51.5074, // London
    endLng: 0.1278,
    color: ['#4a6cff', '#2ad3bc'], // Using --primary and --secondary
    label: 'NY to London',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1500,
    arcAltitude: 0.3,
  },
  {
    startLat: 35.6762, // Tokyo
    startLng: 139.6503,
    endLat: -33.8688, // Sydney
    endLng: 151.2093,
    color: ['#2ad3bc', '#f96d6d'], // Using --secondary and --accent
    label: 'Tokyo to Sydney',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1500,
    arcAltitude: 0.3,
  },
  {
    startLat: 37.7749, // San Francisco
    startLng: -122.4194,
    endLat: 1.3521, // Singapore
    endLng: 103.8198,
    color: ['#4a6cff', '#f96d6d'], // Using --primary and --accent
    label: 'SF to Singapore',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1500,
    arcAltitude: 0.35,
  },
  
  // Additional arcs from previous update
  {
    startLat: 19.4326, // Mexico City
    startLng: -99.1332,
    endLat: -34.6037, // Buenos Aires
    endLng: -58.3816,
    color: ['#4a6cff', '#2ad3bc'],
    label: 'Mexico City to Buenos Aires',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1700,
    arcAltitude: 0.28,
  },
  {
    startLat: 52.5200, // Berlin
    startLng: 13.4050,
    endLat: 55.7558, // Moscow
    endLng: 37.6173,
    color: ['#2ad3bc', '#f96d6d'],
    label: 'Berlin to Moscow',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1300,
    arcAltitude: 0.25,
  },
  {
    startLat: 31.2304, // Shanghai
    startLng: 121.4737,
    endLat: 28.6139, // Dubai
    endLng: 77.2090,
    color: ['#f96d6d', '#4a6cff'],
    label: 'Shanghai to Dubai',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1600,
    arcAltitude: 0.32,
  },
  {
    startLat: -23.5505, // São Paulo
    startLng: -46.6333,
    endLat: 6.5244, // Lagos
    endLng: 3.3792,
    color: ['#2ad3bc', '#4a6cff'],
    label: 'São Paulo to Lagos',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1800,
    arcAltitude: 0.38,
  },
  {
    startLat: 34.0522, // Los Angeles
    startLng: -118.2437,
    endLat: -33.4489, // Cape Town
    endLng: 18.6722,
    color: ['#f96d6d', '#2ad3bc'],
    label: 'LA to Cape Town',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1900,
    arcAltitude: 0.4,
  },
  {
    startLat: 48.8566, // Paris
    startLng: 2.3522,
    endLat: 25.2048, // Mumbai
    endLng: 55.2708,
    color: ['#4a6cff', '#f96d6d'],
    label: 'Paris to Mumbai',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1450,
    arcAltitude: 0.29,
  },
  {
    startLat: 41.9028, // Rome
    startLng: 12.4964,
    endLat: -22.9068, // Rio de Janeiro
    endLng: -43.1729,
    color: ['#2ad3bc', '#4a6cff'],
    label: 'Rome to Rio',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1550,
    arcAltitude: 0.33,
  },
  
  // New India connections
  {
    startLat: 28.6139, // New Delhi, India
    startLng: 77.2090,
    endLat: 25.2048, // Dubai
    endLng: 55.2708,
    color: ['#4a6cff', '#2ad3bc'],
    label: 'New Delhi to Dubai',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1400,
    arcAltitude: 0.28,
  },
  {
    startLat: 18.9220, // Mumbai, India
    startLng: 72.8347,
    endLat: 40.7128, // New York, US
    endLng: -74.0060,
    color: ['#2ad3bc', '#f96d6d'],
    label: 'Mumbai to New York',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1650,
    arcAltitude: 0.36,
  },
  {
    startLat: 12.9716, // Bangalore, India
    startLng: 77.5946,
    endLat: 37.7749, // San Francisco, US
    endLng: -122.4194,
    color: ['#f96d6d', '#4a6cff'],
    label: 'Bangalore to San Francisco',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1750,
    arcAltitude: 0.39,
  },
  {
    startLat: 22.5726, // Kolkata, India
    startLng: 88.3639,
    endLat: 51.5074, // London
    endLng: 0.1278,
    color: ['#4a6cff', '#f96d6d'],
    label: 'Kolkata to London',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1600,
    arcAltitude: 0.31,
  },
  {
    startLat: 13.0827, // Chennai, India
    startLng: 80.2707,
    endLat: -33.8688, // Sydney, Australia
    endLng: 151.2093,
    color: ['#2ad3bc', '#4a6cff'],
    label: 'Chennai to Sydney',
    arcDashLength: 0.9,
    arcDashGap: 4,
    arcDashAnimateTime: 1850,
    arcAltitude: 0.34,
  }
];

// Design system colors
const COLORS = {
  primary: '#4a6cff',
  primaryLight: '#7a8eff',
  primaryDark: '#3451cc',
  secondary: '#2ad3bc',
  secondaryLight: '#5fefdb',
  secondaryDark: '#1fab98'
};

// Custom Globe hexRGBToColor function to tint the globe texture
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const GlobeComponent = () => {
  const globeEl = useRef();
  const [globeReady, setGlobeReady] = useState(false);

  // Set globe rotation and initial view
  useEffect(() => {
    if (globeEl.current) {
      // Access the globe's THREE.js objects
      const globeObject = globeEl.current.scene();
      if (globeObject) {
        // Find the globe mesh in the scene
        globeObject.traverse((object) => {
          if (object.type === 'Mesh' && object.name === 'globe') {
            // Use hexToRgb to convert primary color
            const primaryColorRgb = hexToRgb(COLORS.primary);
            
            // Apply the primary color tint to the globe
            object.material.color = new THREE.Color(
              primaryColorRgb.r/255, 
              primaryColorRgb.g/255, 
              primaryColorRgb.b/255
            );
            object.material.opacity = 0.8;
            object.material.transparent = true;
            object.material.shininess = 0.7;
          }
        });
      }

      // Set initial view to focus on India region
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.pointOfView(
        { lat: 20, lng: 78, altitude: 2.6 }, // Centered more towards India with increased altitude
        1000
      );
      setGlobeReady(true);
    }
  }, []);

  // Handle responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (globeEl.current) {
        const baseWidth = window.innerWidth > 1024
          ? Math.min(window.innerWidth * 0.45, 450) // Increased base size
          : window.innerWidth > 768
            ? window.innerWidth * 0.85
            : window.innerWidth * 0.95;
        const width = Math.max(250, baseWidth); // Increased minimum width
        const height = width;
        globeEl.current.width = width;
        globeEl.current.height = height;
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div style={{ animation: 'fadeInRight 1s ease-out' }}>
      <Globe
        ref={globeEl}
        width={450} // Increased default width
        height={450} // Increased default height
        globeRadius={150} // Increased globe radius to make the globe itself larger
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-water.png" // Using water map for better color control
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        arcsData={ARC_DATA}
        arcColor="color"
        arcDashLength="arcDashLength"
        arcDashGap="arcDashGap"
        arcDashAnimateTime="arcDashAnimateTime"
        arcAltitude="arcAltitude"
        arcLabel="label"
        arcStroke={0.75}
        showAtmosphere={true}
        atmosphereColor={COLORS.primaryLight} // Using primary-light for atmosphere
        atmosphereAltitude={0.2}
        rendererConfig={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        onGlobeReady={() => setGlobeReady(true)}
      />
      {!globeReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              color: COLORS.primary,
              fontSize: '16px',
              fontFamily: "'Inter', sans-serif",
            }}
          >Loading Globe...</p>
        </div>
      )}
    </div>
  );
};

export default GlobeComponent;