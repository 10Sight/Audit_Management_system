// RoboticArm3D.jsx
import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

function Arm() {
  const shoulder = useRef();
  const elbow = useRef();
  const wrist = useRef();
  const gripper = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    shoulder.current.rotation.z = Math.sin(t) * 0.2;
    elbow.current.rotation.z = Math.sin(t * 1.2) * 0.25;
    wrist.current.rotation.z = Math.sin(t * 1.5) * 0.3;
    gripper.current.rotation.y = Math.sin(t * 0.8) * 0.1;
  });

  const blue = new THREE.MeshStandardMaterial({
    color: "#2196f3", // Blue like the screenshot
    metalness: 0.6,
    roughness: 0.4,
  });

  const dark = new THREE.MeshStandardMaterial({
    color: "#444", // Dark joints
    metalness: 0.4,
    roughness: 0.6,
  });

  const boxMat = new THREE.MeshStandardMaterial({
    color: "#d4a373", // cardboard brown
    roughness: 0.8,
  });

  return (
    <group>
      {/* Base */}
      <mesh position={[0, -1.5, 0]} material={blue} castShadow receiveShadow>
        <cylinderGeometry args={[1.4, 1.4, 0.6, 64]} />
      </mesh>

      {/* Rotating shoulder joint */}
      <group ref={shoulder}>
        <mesh material={dark} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.5, 32]} />
        </mesh>

        {/* Upper Arm */}
        <mesh position={[1.2, 0, 0]} material={blue} castShadow>
          <boxGeometry args={[2.4, 0.5, 0.5]} />
        </mesh>

        {/* Elbow joint */}
        <group ref={elbow} position={[2.4, 0, 0]}>
          <mesh material={dark} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 32]} />
          </mesh>

          {/* Forearm */}
          <mesh position={[1, 0, 0]} material={blue} castShadow>
            <boxGeometry args={[2, 0.45, 0.45]} />
          </mesh>

          {/* Wrist */}
          <group ref={wrist} position={[2, 0, 0]}>
            <mesh material={dark} castShadow>
              <cylinderGeometry args={[0.35, 0.35, 0.3, 32]} />
            </mesh>

            {/* Gripper */}
            <group ref={gripper} position={[0.6, 0, 0]}>
              <mesh position={[0, 0.25, 0]} material={blue} castShadow>
                <boxGeometry args={[0.6, 0.15, 0.2]} />
              </mesh>
              <mesh position={[0, -0.25, 0]} material={blue} castShadow>
                <boxGeometry args={[0.6, 0.15, 0.2]} />
              </mesh>

              {/* Box being held */}
              <mesh position={[0.9, 0, 0]} material={boxMat} castShadow>
                <boxGeometry args={[0.6, 0.6, 0.6]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* A target box on ground */}
      <mesh position={[3.5, -1.2, 0]} material={boxMat} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
      </mesh>
    </group>
  );
}

export default function RoboticArm() {
  return (
    <div className="w-full h-screen bg-gray-100">
      <Canvas
        shadows
        camera={{ position: [6, 4, 7], fov: 50 }}
      >
        {/* Lights */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <spotLight position={[-5, 8, 5]} angle={0.25} intensity={1} />

        {/* Arm */}
        <Arm />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <shadowMaterial opacity={0.4} />
        </mesh>

        {/* Reflection environment */}
        <Environment preset="city" />

        {/* Controls */}
        <OrbitControls enableZoom={true} />
      </Canvas>
    </div>
  );
}
