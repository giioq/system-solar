import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  4000
);

camera.position.set(0, 150, 560);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

document.getElementById("scene").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.045;
controls.minDistance = 55;
controls.maxDistance = 1100;

scene.background = new THREE.Color(0x000005);

const ambient = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(ambient);

const sunlight = new THREE.PointLight(0xffffff, 9, 3000, 1.15);
scene.add(sunlight);

const starsGeometry = new THREE.BufferGeometry();
const starPositions = [];
const starColors = [];

for (let i = 0; i < 18000; i++) {
  const radius = 1000 + Math.random() * 1800;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  starPositions.push(x, y, z);

  const temperature = Math.random();

  if (temperature < 0.65) {
    starColors.push(0.82, 0.88, 1);
  } else if (temperature < 0.9) {
    starColors.push(1, 0.95, 0.85);
  } else {
    starColors.push(1, 0.72, 0.48);
  }
}

starsGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starPositions, 3)
);

starsGeometry.setAttribute(
  "color",
  new THREE.Float32BufferAttribute(starColors, 3)
);

const starsMaterial = new THREE.PointsMaterial({
  size: 1.35,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  sizeAttenuation: true
});

const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

function hash(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);

  const xf = x - x0;
  const yf = y - y0;

  const a = hash(x0, y0);
  const b = hash(x0 + 1, y0);
  const c = hash(x0, y0 + 1);
  const d = hash(x0 + 1, y0 + 1);

  const u = smooth(xf);
  const v = smooth(yf);

  return (
    a +
    (b - a) * u +
    (c - a) * v +
    (a - b - c + d) * u * v
  );
}

function fbm(x, y) {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let i = 0; i < 7; i++) {
    total += valueNoise(x * frequency, y * frequency) * amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }

  return total;
}

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

function createPlanetTexture(type, width = 1536, height = 768) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", {
    alpha: false
  });

  const image = ctx.createImageData(width, height);
  const data = image.data;

  for (let y = 0; y < height; y++) {
    const v = y / height;

    for (let x = 0; x < width; x++) {
      const u = x / width;

      let r = 0;
      let g = 0;
      let b = 0;

      const n1 = fbm(u * 7, v * 7);
      const n2 = fbm(u * 18 + 12, v * 18 + 8);
      const n3 = fbm(u * 45 + 20, v * 45 + 17);

      if (type === "sun") {
        const granulation =
          Math.sin(u * 420 + n1 * 5) *
          Math.sin(v * 210 + n2 * 5);

        const cells = n2 * 55 + granulation * 22;

        r = 220 + cells;
        g = 72 + cells * 0.65;
        b = 7 + cells * 0.12;

        const active =
          Math.pow(
            Math.max(
              0,
              Math.sin(u * 31 + n2 * 3) *
              Math.sin(v * 23 + n1 * 4)
            ),
            8
          );

        r -= active * 45;
        g -= active * 28;
      }

      if (type === "mercury") {
        const terrain = n1 * 75;
        const craterField =
          Math.sin(u * 115 + n2 * 10) *
          Math.sin(v * 95 + n3 * 10);

        r = 75 + terrain + craterField * 12;
        g = 72 + terrain + craterField * 12;
        b = 68 + terrain * 0.9 + craterField * 10;

        if (craterField < -0.45) {
          r -= 35;
          g -= 34;
          b -= 32;
        }
      }

      if (type === "venus") {
        const latitude = Math.sin(v * Math.PI);
        const clouds =
          Math.sin(v * 65 + n1 * 10) * 25 +
          Math.sin(v * 155 + u * 8 + n2 * 8) * 8;

        r = 190 + clouds + n1 * 35;
        g = 145 + clouds * 0.72 + n2 * 30;
        b = 65 + clouds * 0.32 + n3 * 18;

        r += latitude * 8;
        g += latitude * 5;
      }

      if (type === "earth") {
        const continents =
          fbm(u * 5.5 + 4, v * 4.5 + 2) +
          fbm(u * 12 + 7, v * 10 + 3) * 0.35;

        const coast = continents - 0.55;

        if (continents > 0.61) {
          const forest = fbm(u * 25, v * 25);

          r = 28 + forest * 55;
          g = 75 + forest * 90;
          b = 30 + forest * 35;

          if (continents > 0.78) {
            r += 65;
            g += 55;
            b += 35;
          }
        } else {
          const depth = fbm(u * 9 + 3, v * 9 + 4);

          r = 5 + depth * 18;
          g = 35 + depth * 45;
          b = 105 + depth * 105;
        }

        if (Math.abs(coast) < 0.045) {
          r = 70;
          g = 105;
          b = 65;
        }

        const clouds =
          fbm(u * 18 + 30, v * 15 + 20);

        if (clouds > 0.72) {
          const cloudStrength = (clouds - 0.72) * 3.5;

          r = r * (1 - cloudStrength) + 225 * cloudStrength;
          g = g * (1 - cloudStrength) + 230 * cloudStrength;
          b = b * (1 - cloudStrength) + 235 * cloudStrength;
        }

        if (v < 0.065 || v > 0.935) {
          r = 225;
          g = 235;
          b = 242;
        }
      }

      if (type === "mars") {
        const terrain = fbm(u * 8, v * 8);
        const darkRegions = fbm(u * 18 + 10, v * 18 + 4);

        r = 125 + terrain * 100;
        g = 32 + terrain * 40;
        b = 19 + terrain * 25;

        if (darkRegions < 0.32) {
          r *= 0.65;
          g *= 0.65;
          b *= 0.65;
        }

        if (v < 0.075 || v > 0.925) {
          r = 205;
          g = 190;
          b = 175;
        }
      }

      if (type === "jupiter") {
        const latitude = v * Math.PI * 2;

        const bands =
          Math.sin(latitude * 17 + n1 * 2.5) * 25 +
          Math.sin(latitude * 37 + n2 * 5) * 9;

        const turbulence =
          n1 * 35 +
          n2 * 18;

        r = 177 + bands + turbulence;
        g = 130 + bands * 0.72 + turbulence * 0.72;
        b = 88 + bands * 0.48 + turbulence * 0.5;

        const stormX = 0.72;
        const stormY = 0.58;

        const dx = (u - stormX) * 7;
        const dy = (v - stormY) * 15;

        const storm =
          Math.exp(-(dx * dx + dy * dy));

        r += storm * 80;
        g -= storm * 35;
        b -= storm * 28;

        const whiteOval =
          Math.exp(
            -(
              Math.pow((u - 0.35) * 9, 2) +
              Math.pow((v - 0.47) * 18, 2)
            )
          );

        r += whiteOval * 35;
        g += whiteOval * 35;
        b += whiteOval * 32;
      }

      if (type === "saturn") {
        const latitude = v * Math.PI * 2;

        const bands =
          Math.sin(latitude * 23 + n1 * 2) * 15 +
          Math.sin(latitude * 58 + n2 * 3) * 5;

        r = 194 + bands + n1 * 22;
        g = 171 + bands * 0.8 + n2 * 20;
        b = 117 + bands * 0.55 + n3 * 16;
      }

      if (type === "uranus") {
        const bands =
          Math.sin(v * 60 + n1 * 4) * 5;

        r = 62 + n1 * 22 + bands;
        g = 170 + n2 * 28 + bands;
        b = 190 + n3 * 35 + bands;
      }

      if (type === "neptune") {
        const bands =
          Math.sin(v * 65 + n1 * 5) * 17;

        const storm =
          Math.exp(
            -(
              Math.pow((u - 0.63) * 8, 2) +
              Math.pow((v - 0.48) * 15, 2)
            )
          );

        r = 18 + n1 * 15;
        g = 55 + bands * 0.4 + n2 * 18;
        b = 145 + bands + n3 * 65;

        r += storm * 25;
        g += storm * 25;
        b += storm * 30;
      }

      if (type === "moon") {
        const terrain = fbm(u * 11, v * 11);
        const fine = fbm(u * 45 + 5, v * 45 + 7);

        r = 105 + terrain * 100 + fine * 20;
        g = 105 + terrain * 100 + fine * 20;
        b = 102 + terrain * 96 + fine * 20;

        const crater =
          Math.sin(u * 95 + n1 * 10) *
          Math.sin(v * 80 + n2 * 10);

        if (crater < -0.35) {
          r -= 35;
          g -= 35;
          b -= 33;
        }
      }

      const i = (y * width + x) * 4;

      data[i] = clamp(r);
      data[i + 1] = clamp(g);
      data[i + 2] = clamp(b);
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return texture;
}

const textures = {
  sun: createPlanetTexture("sun"),
  mercury: createPlanetTexture("mercury"),
  venus: createPlanetTexture("venus"),
  earth: createPlanetTexture("earth"),
  mars: createPlanetTexture("mars"),
  jupiter: createPlanetTexture("jupiter"),
  saturn: createPlanetTexture("saturn"),
  uranus: createPlanetTexture("uranus"),
  neptune: createPlanetTexture("neptune"),
  moon: createPlanetTexture("moon")
};

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(38, 128, 128),
  new THREE.MeshBasicMaterial({
    map: textures.sun
  })
);

scene.add(sun);

const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(51, 96, 96),
  new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.11,
    side: THREE.BackSide,
    depthWrite: false
  })
);

scene.add(sunGlow);

const sunGlowLarge = new THREE.Mesh(
  new THREE.SphereGeometry(66, 96, 96),
  new THREE.MeshBasicMaterial({
    color: 0xff3300,
    transparent: true,
    opacity: 0.045,
    side: THREE.BackSide,
    depthWrite: false
  })
);

scene.add(sunGlowLarge);

const planets = [];

function createPlanet(
  name,
  size,
  distance,
  texture,
  speed,
  roughness
) {
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(size, 128, 128),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness,
      metalness: 0,
      envMapIntensity: 0.25
    })
  );

  planet.position.x = distance;
  orbitGroup.add(planet);

  const curve = new THREE.EllipseCurve(
    0,
    0,
    distance,
    distance,
    0,
    Math.PI * 2,
    false,
    0
  );

  const points = curve.getPoints(360);

  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(
      p => new THREE.Vector3(p.x, 0, p.y)
    )
  );

  const material = new THREE.LineBasicMaterial({
    color: 0x252525,
    transparent: true,
    opacity: 0.48
  });

  const orbit = new THREE.LineLoop(
    geometry,
    material
  );

  scene.add(orbit);

  planets.push({
    name,
    planet,
    orbitGroup,
    speed
  });
}

createPlanet("Mercúrio", 7, 70, textures.mercury, 0.018, 1);
createPlanet("Vênus", 10, 105, textures.venus, 0.014, 0.95);
createPlanet("Terra", 12, 145, textures.earth, 0.011, 0.72);
createPlanet("Marte", 9, 180, textures.mars, 0.009, 0.96);
createPlanet("Júpiter", 24, 250, textures.jupiter, 0.005, 0.9);
createPlanet("Saturno", 21, 330, textures.saturn, 0.004, 0.86);
createPlanet("Urano", 16, 400, textures.uranus, 0.003, 0.78);
createPlanet("Netuno", 16, 470, textures.neptune, 0.002, 0.82);

const saturn = planets.find(
  p => p.name === "Saturno"
);

const ringCanvas = document.createElement("canvas");
ringCanvas.width = 2048;
ringCanvas.height = 2048;

const ringCtx = ringCanvas.getContext("2d");

ringCtx.clearRect(
  0,
  0,
  ringCanvas.width,
  ringCanvas.height
);

const center = 1024;

for (let radius = 300; radius < 950; radius++) {
  const normalized = (radius - 300) / 650;

  const gap1 =
    Math.abs(normalized - 0.36) < 0.012;

  const gap2 =
    Math.abs(normalized - 0.57) < 0.018;

  const density =
    0.35 +
    Math.sin(radius * 0.12) * 0.18 +
    Math.sin(radius * 0.43) * 0.12;

  if (gap1 || gap2) {
    continue;
  }

  ringCtx.beginPath();
  ringCtx.arc(
    center,
    center,
    radius,
    0,
    Math.PI * 2
  );

  const brightness =
    150 +
    density * 100;

  ringCtx.strokeStyle =
    `rgba(${brightness},${brightness - 15},${brightness - 35},0.65)`;

  ringCtx.lineWidth = 1.5;
  ringCtx.stroke();
}

const ringTexture = new THREE.CanvasTexture(
  ringCanvas
);

ringTexture.colorSpace =
  THREE.SRGBColorSpace;

const saturnRing = new THREE.Mesh(
  new THREE.RingGeometry(
    27,
    50,
    256
  ),
  new THREE.MeshBasicMaterial({
    map: ringTexture,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    opacity: 0.92
  })
);

saturnRing.rotation.x =
  Math.PI / 2;

scene.add(saturnRing);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(
    4,
    96,
    96
  ),
  new THREE.MeshStandardMaterial({
    map: textures.moon,
    roughness: 1
  })
);

scene.add(moon);

const earth = planets.find(
  p => p.name === "Terra"
);

let earthAtmosphere;

if (earth) {
  earthAtmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(
      12.65,
      96,
      96
    ),
    new THREE.MeshBasicMaterial({
      color: 0x4fa8ff,
      transparent: true,
      opacity: 0.045,
      side: THREE.BackSide,
      depthWrite: false
    })
  );

  earth.planet.add(
    earthAtmosphere
  );
}

const moonState = {
  angle: 0
};

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed =
    clock.getElapsedTime();

  planets.forEach(p => {
    p.orbitGroup.rotation.y +=
      p.speed;

    p.planet.rotation.y +=
      0.006;
  });

  sun.rotation.y +=
    0.0018;

  sunGlow.rotation.y -=
    0.0007;

  sunGlowLarge.rotation.y +=
    0.0004;

  stars.rotation.y +=
    0.000015;

  if (earthAtmosphere) {
    earthAtmosphere.rotation.y +=
      0.0007;
  }

  if (saturn) {
    const position =
      new THREE.Vector3();

    saturn.planet.getWorldPosition(
      position
    );

    saturnRing.position.copy(
      position
    );
  }

  if (earth) {
    const earthPosition =
      new THREE.Vector3();

    earth.planet.getWorldPosition(
      earthPosition
    );

    moonState.angle +=
      0.022;

    moon.position.x =
      earthPosition.x +
      Math.cos(moonState.angle) * 20;

    moon.position.z =
      earthPosition.z +
      Math.sin(moonState.angle) * 20;

    moon.position.y =
      earthPosition.y +
      Math.sin(elapsed * 0.7) * 1.2;

    moon.rotation.y +=
      0.004;
  }

  controls.update();

  renderer.render(
    scene,
    camera
  );
}

animate();

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }
);
