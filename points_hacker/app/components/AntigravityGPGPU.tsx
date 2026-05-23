"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── THE EXACT GLSL SIMPLEX NOISE ALGORITHM (Google's Gh.noise variable) ───
const GLSL_SIMPLEX_NOISE = `
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }
`;

export default function AntigravityGPGPU() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    // Unminifying basic configuration contexts
    const theme = "dark"; 
    const density = 200;
    const particlesScale = 0.75;
    const ringWidth = 0.107;
    const ringWidth2 = 0.05;
    const ringDisplacement = 0.15;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);

    // Color controls mapped exactly to your custom landing page variables
    const colorControls = {
      color1: "#60A5FA", // Blue
      color2: "#A78BFA", // Violet
      color3: "#F2C94C", // Yellow
    };

    // Initialize Base Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1b2a); // Set to your exact NAVY hex layout background

    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
      stencil: false,
      precision: "highp"
    });

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.z = 3.1;

    // GPGPU Setup
    const SIZE = 256;
    const count = SIZE * SIZE;
    let everRendered = false;
    let lastTime = 0;

    const ringPos = new THREE.Vector2(0, 0);
    const cursorPos = new THREE.Vector2(0, 0);
    const colorScheme = theme === "dark" ? 0 : 1;
    const particleScale = (width / pixelRatio / 2000) * particlesScale;

    // Fast inline Poisson-distribution mockup builder replacing t7.default
    const pointsData: number[] = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 230; 
      pointsData.push(r * Math.cos(theta), r * Math.sin(theta));
    }

    // Positions allocation data mapping strings
    const positionsArray = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const r = i * 4;
      positionsArray[r + 0] = pointsData[i * 2 + 0] * (1 / 250);
      positionsArray[r + 1] = pointsData[i * 2 + 1] * (1 / 250);
      positionsArray[r + 2] = 0;
      positionsArray[r + 3] = 0;
    }

    const posTex = new THREE.DataTexture(positionsArray, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
    posTex.needsUpdate = true;

    const createRenderTarget = () => new THREE.WebGLRenderTarget(SIZE, SIZE, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false
    });

    let rt1 = createRenderTarget();
    let rt2 = createRenderTarget();

    renderer.setRenderTarget(rt1); renderer.clear();
    renderer.setRenderTarget(rt2); renderer.clear();
    renderer.setRenderTarget(null);

    const simScene = new THREE.Scene();
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // ─── GOOGLE'S EXACT SIMULATION SHADER IMPLEMENTATION ───
    const simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPosition: { value: posTex },
        uPosRefs: { value: posTex },
        uRingPos: { value: new THREE.Vector2(0, 0) },
        uRingRadius: { value: 0.2 },
        uDeltaTime: { value: 0 },
        uRingWidth: { value: .05 },
        uRingWidth2: { value: .015 },
        uRingDisplacement: { value: ringDisplacement },
        uTime: { value: 0 }
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uPosition;
        uniform sampler2D uPosRefs;
        uniform vec2 uRingPos;
        uniform float uTime;
        uniform float uDeltaTime;
        uniform float uRingRadius;
        uniform float uRingWidth;
        uniform float uRingWidth2;
        uniform float uRingDisplacement;

        ${GLSL_SIMPLEX_NOISE}

        void main() {
          vec2 simTexCoords = gl_FragCoord.xy / vec2(${SIZE.toFixed(1)}, ${SIZE.toFixed(1)});
          vec4 pFrame = texture2D(uPosition, simTexCoords);
          float scale = pFrame.z;
          float velocity = pFrame.w;
          vec2 refPos = texture2D(uPosRefs, simTexCoords).xy;
          float time = uTime * .5;
          vec2 curentPos = refPos;
          vec2 pos = pFrame.xy;
          pos *= .8;

          float dist = distance(curentPos.xy, uRingPos);
          float noise0 = snoise(vec3(curentPos.xy * .2 + vec2(18.4924, 72.9744), time * 0.5));
          float dist1 = distance(curentPos.xy + (noise0 * .005), uRingPos);

          float t = smoothstep(uRingRadius - (uRingWidth * 2.), uRingRadius, dist) - smoothstep(uRingRadius, uRingRadius + uRingWidth, dist1);
          float t2 = smoothstep(uRingRadius - (uRingWidth2 * 2.), uRingRadius, dist) - smoothstep(uRingRadius, uRingRadius + uRingWidth2, dist1);
          float t3 = smoothstep(uRingRadius + uRingWidth2, uRingRadius, dist);

          t = pow(t, 2.); t2 = pow(t2, 3.);
          t += t2 * 3.; t += t3 * .4;
          t += snoise(vec3(curentPos.xy * 30. + vec2(11.4924, 12.9744), time * 0.5)) * t3 * .5;

          float nS = snoise(vec3(curentPos.xy * 2. + vec2(18.4924, 72.9744), time * 0.5));
          t += pow((nS + 1.5) * .5, 2.) * .6;

          float noise1 = snoise(vec3(curentPos.xy * 4. + vec2(88.494, 32.4397), time * 0.35));
          float noise2 = snoise(vec3(curentPos.xy * 4. + vec2(50.904, 120.947), time * 0.35));
          float noise3 = snoise(vec3(curentPos.xy * 20. + vec2(18.4924, 72.9744), time * .5));
          float noise4 = snoise(vec3(curentPos.xy * 20. + vec2(50.904, 120.947), time * .5));

          vec2 disp = vec2(noise1, noise2) * .03;
          disp += vec2(noise3, noise4) * .005;

          disp.x += sin((refPos.x * 20.) + (time * 4.)) * .02 * clamp(dist, 0., 1.);
          disp.y += cos((refPos.y * 20.) + (time * 3.)) * .02 * clamp(dist, 0., 1.);

          pos -= (uRingPos - (curentPos + disp)) * pow(t2, .75) * uRingDisplacement;

          float scaleDiff = t - scale;
          scaleDiff *= .2;
          scale += scaleDiff;

          vec2 finalPos = curentPos + disp + (pos * .25);
          velocity *= .5;
          velocity += scale * .25;

          gl_FragColor = vec4(finalPos, scale, velocity);
        }
      `
    });

    const simMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
    simScene.add(simMesh);

    // Setup Render Geometry attributes strings definitions
    const renderGeometry = new THREE.BufferGeometry();
    const uvsAttr = new Float32Array(count * 2);
    const seedsAttr = new Float32Array(count * 4);
    const placeholdersAttr = new Float32Array(count * 3);

    for (let s = 0; s < count; s++) {
      uvsAttr[s * 2] = (s % SIZE) / SIZE;
      uvsAttr[s * 2 + 1] = Math.floor(s / SIZE) / SIZE;

      seedsAttr[s * 4] = Math.random();
      seedsAttr[s * 4 + 1] = Math.random();
      seedsAttr[s * 4 + 2] = Math.random();
      seedsAttr[s * 4 + 3] = Math.random();
    }

    renderGeometry.setAttribute("position", new THREE.BufferAttribute(placeholdersAttr, 3));
    renderGeometry.setAttribute("uv", new THREE.BufferAttribute(uvsAttr, 2));
    renderGeometry.setAttribute("seeds", new THREE.BufferAttribute(seedsAttr, 4));

    // ─── GOOGLE'S EXACT RENDER GRAPHICS MATERIAL SHADERS ───
    const renderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPosition: { value: posTex },
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(colorControls.color1) },
        uColor2: { value: new THREE.Color(colorControls.color2) },
        uColor3: { value: new THREE.Color(colorControls.color3) },
        uAlpha: { value: 1 },
        uRingPos: { value: new THREE.Vector2(0, 0) },
        uRez: { value: new THREE.Vector2(width, height) },
        uParticleScale: { value: particleScale },
        uPixelRatio: { value: pixelRatio },
        uColorScheme: { value: colorScheme }
      },
      vertexShader: `
        precision highp float;
        attribute vec4 seeds;
        uniform sampler2D uPosition;
        uniform float uTime;
        uniform float uParticleScale;
        uniform float uPixelRatio;
        uniform int uColorScheme;

        varying vec4 vSeeds;
        varying float vVelocity;
        varying vec2 vLocalPos;
        varying vec2 vScreenPos;
        varying float vScale;

        void main() {
          vec4 pos = texture2D(uPosition, uv);
          vSeeds = seeds;
          vVelocity = pos.w;
          vScale = pos.z;
          vLocalPos = pos.xy;
          
          vec4 viewSpace = modelViewMatrix * vec4(vec3(pos.xy, 0.), 1.0);
          gl_Position = projectionMatrix * viewSpace;
          vScreenPos = gl_Position.xy;
          gl_PointSize = ((vScale * 7.) * (uPixelRatio * 0.5) * uParticleScale);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec4 vSeeds;
        varying vec2 vScreenPos;
        varying vec2 vLocalPos;
        varying float vScale;
        varying float vVelocity;

        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec2 uRingPos;
        uniform vec2 uRez;
        uniform float uAlpha;
        uniform float uTime;
        uniform int uColorScheme;

        ${GLSL_SIMPLEX_NOISE}

        float sdRoundBox(in vec2 p, in vec2 b, in vec4 r) {
          r.xy = (p.x > 0.0) ? r.xy : r.zw;
          r.x = (p.y > 0.0) ? r.x : r.y;
          vec2 q = abs(p) - b + r.x;
          return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
        }

        vec2 rotate(vec2 v, float a) {
          float s = sin(a); float c = cos(a);
          return mat2(c, s, -s, c) * v;
        }

        void main() {
          float uBorderSize = 0.2;
          float ratio = uRez.x / uRez.y;

          float noiseAngle = snoise(vec3(vLocalPos * 10. + vec2(18.4924, 72.9744), uTime * .85));
          float noiseColor = snoise(vec3(vLocalPos * 2. + vec2(74.664, 91.556), uTime * .5));
          noiseColor = (noiseColor + 1.) * .5;

          float angle = atan(vLocalPos.y - uRingPos.y, vLocalPos.x - uRingPos.x);

          vec2 uv = gl_PointCoord.xy - vec2(0.5);
          uv.y *= -1.;
          uv = rotate(uv, -angle + (noiseAngle * .5));

          float h = 0.8;
          float progress = smoothstep(0., .75, pow(noiseColor, 2.));
          vec3 col = mix(mix(uColor1, uColor2, progress/h), mix(uColor2, uColor3, (progress - h)/(1.0 - h)), step(h, progress));

          float rounded = sdRoundBox(uv, vec2(0.5, 0.2), vec4(.25));
          rounded = smoothstep(.1, 0., rounded);

          float a = uAlpha * rounded * smoothstep(0.1, 0.2, vScale);
          if(a < 0.01) discard;

          vec3 color = clamp(col, 0., 1.);
          color = mix(color, color * clamp(vVelocity, 0., 1.), float(uColorScheme));
          gl_FragColor = vec4(color, clamp(a, 0., 1.));
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const mesh = new THREE.Points(renderGeometry, renderMaterial);
    mesh.scale.set(5, 5, 5);
    scene.add(mesh);

    // Handle Raycast Planes & Tracking coordinates matching system
    const clock = new THREE.Clock();
    let frameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      cursorPos.set(x * 0.35, y * 0.35); // Adjusted projection map ratio directly
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Core Frame execution ticking loop
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      const time = clock.getElapsedTime();
      const elapsed = time - lastTime;
      lastTime = time;

      // Match Google's exact dampened ring interpolation curves logic
      ringPos.lerp(cursorPos, 0.04);

      simMaterial.uniforms.uPosition.value = everRendered ? rt1.texture : posTex;
      simMaterial.uniforms.uTime.value = time;
      simMaterial.uniforms.uDeltaTime.value = elapsed;
      simMaterial.uniforms.uRingRadius.value = .175 + Math.sin(time * 1.0) * .03 + Math.cos(time * 3.0) * .02;
      simMaterial.uniforms.uRingPos.value = ringPos;
      simMaterial.uniforms.uRingWidth.value = ringWidth;
      simMaterial.uniforms.uRingWidth2.value = ringWidth2;
      simMaterial.uniforms.uRingDisplacement.value = ringDisplacement;

      renderer.setRenderTarget(rt2);
      renderer.render(simScene, simCamera);
      renderer.setRenderTarget(null);

      renderMaterial.uniforms.uPosition.value = everRendered ? rt2.texture : posTex;
      renderMaterial.uniforms.uTime.value = time;
      renderMaterial.uniforms.uRingPos.value = ringPos;
      renderMaterial.uniforms.uParticleScale.value = (container.offsetWidth / pixelRatio / 2000) * particlesScale;

      renderer.render(scene, camera);

      // Ping-pong framebuffer execution references swap
      const temp = rt1;
      rt1 = rt2;
      rt2 = temp;
      everRendered = true;
    };

    animate();

    const handleResize = () => {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderMaterial.uniforms.uRez.value.set(w, h);
      renderMaterial.uniforms.uPixelRatio.value = pixelRatio;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      simMaterial.dispose();
      renderMaterial.dispose();
      renderGeometry.dispose();
      rt1.dispose();
      rt2.dispose();
      posTex.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-transparent"
    />
  );
}