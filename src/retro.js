// "Classic 90s look": draws the same block world like an early-90s PC game.
// - flat camera (no perspective), so block models read like sprites
// - EGA colors (each of red, green and blue has just 4 levels: 64 colors), with
//   checkerboard-style (ordered) dithering where a color falls between two levels
// - thick black outlines around everything
// The game itself doesn't change; this only changes how a frame is drawn.
import * as THREE from '../vendor/three.module.min.js';

// 4x4 Bayer matrix, values 0..15.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const LEVELS = 3; // steps per channel (0, 1/3, 2/3, 1)
// How much of a step dithering covers. 1 = every in-between color gets a pattern;
// less keeps big areas flat, like hand-drawn sprites.
const DITHER = 0.3;
const SATURATE = 1.35; // old games used bold colors
const BRIGHTEN = 1.12;

const vert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const frag = /* glsl */`
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform vec2 texel;
  uniform float near, far, edge;
  varying vec2 vUv;

  float depthAt(vec2 uv) { return near + texture2D(tDepth, uv).x * (far - near); }
  vec3 toSRGB(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }
  float bayer(vec2 p) {
    int i = int(mod(p.x, 4.0)) + 4 * int(mod(p.y, 4.0));
    int b[16] = int[16](${BAYER.join(', ')});
    return (float(b[i]) + 0.5) / 16.0;
  }

  void main() {
    // Outline: this pixel sits just outside something clearly nearer to the camera.
    // (A flat or sloped surface sums to ~0, so floors and walls stay clean.)
    float d = depthAt(vUv);
    float l = depthAt(vUv - vec2(texel.x, 0.0)), r = depthAt(vUv + vec2(texel.x, 0.0));
    float u = depthAt(vUv + vec2(0.0, texel.y)), dn = depthAt(vUv - vec2(0.0, texel.y));
    if (l + r + u + dn - 4.0 * d < -edge) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

    vec3 c = toSRGB(texture2D(tColor, vUv).rgb * ${BRIGHTEN.toFixed(3)});
    float grey = dot(c, vec3(0.3, 0.59, 0.11));
    c = clamp(mix(vec3(grey), c, ${SATURATE.toFixed(3)}), 0.0, 1.0);
    c = floor(c * ${LEVELS.toFixed(1)} + 0.5 + (bayer(gl_FragCoord.xy) - 0.5) * ${DITHER.toFixed(3)}) / ${LEVELS.toFixed(1)};
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }
`;

export class RetroRenderer {
  constructor() {
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter });
    this.target.depthTexture = new THREE.DepthTexture(1, 1);
    this.target.depthTexture.type = THREE.FloatType;
    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        tColor: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        texel: { value: new THREE.Vector2() },
        near: { value: 1 }, far: { value: 600 },
        edge: { value: 6 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
  }

  // Match a flat camera to a perspective one: same position and direction, and the
  // same framing on the plane z = camera.userData.focusZ (default 0), where the
  // action in every scene happens.
  // camera.userData.retroPitch (degrees) tilts the view down at least that much,
  // since a flat camera looking straight ahead hides the floor.
  sync(src) {
    const cam = this.camera;
    src.updateMatrixWorld();
    const fwd = new THREE.Vector3();
    src.getWorldDirection(fwd);
    let dist = src.userData.focusDist;
    if (dist == null) {
      const fz = src.userData.focusZ ?? 0;
      dist = fwd.z < -0.05 ? (fz - src.position.z) / fwd.z : 100;
    }
    cam.position.copy(src.position);
    cam.quaternion.copy(src.quaternion);
    const minPitch = THREE.MathUtils.degToRad(src.userData.retroPitch || 0);
    if (-fwd.y < Math.sin(minPitch)) {
      const focus = src.position.clone().addScaledVector(fwd, dist);
      const flat = Math.hypot(fwd.x, fwd.z) || 1;
      const dir = new THREE.Vector3((fwd.x / flat) * Math.cos(minPitch), -Math.sin(minPitch), (fwd.z / flat) * Math.cos(minPitch));
      cam.position.copy(focus).addScaledVector(dir, -dist);
      cam.up.set(0, 1, 0);
      cam.lookAt(focus);
    }
    const hh = Math.max(1, dist) * Math.tan(THREE.MathUtils.degToRad(src.fov / 2)) / src.zoom;
    cam.left = -hh * src.aspect; cam.right = hh * src.aspect;
    cam.top = hh; cam.bottom = -hh;
    cam.near = src.near; cam.far = src.far;
    if (src.view?.enabled) {
      const v = src.view;
      cam.setViewOffset(v.fullWidth, v.fullHeight, v.offsetX, v.offsetY, v.width, v.height);
    } else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return cam;
  }

  render(renderer, scene, cam) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (this.target.width !== size.x || this.target.height !== size.y) this.target.setSize(size.x, size.y);
    const u = this.material.uniforms;
    u.texel.value.set(1 / size.x, 1 / size.y);
    u.near.value = cam.near;
    u.far.value = cam.far;
    renderer.setRenderTarget(this.target);
    renderer.render(scene, cam);
    renderer.setRenderTarget(null);
    renderer.render(this.quadScene, this.quadCam);
  }
}

// Same look for a small transparent picture (shop and wardrobe thumbnails):
// the same colors and dithering, plus a black outline around the item.
export function retroImage(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: hgt } = canvas;
  const img = ctx.getImageData(0, 0, w, hgt);
  const px = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < hgt && px[(y * w + x) * 4 + 3] > 128;
  const out = new Uint8ClampedArray(px.length);
  for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!solid(x, y)) {
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out[i + 3] = 255; // black outline
      continue;
    }
    const n = ((BAYER[(x % 4) + 4 * (y % 4)] + 0.5) / 16 - 0.5) * DITHER;
    const c = [px[i], px[i + 1], px[i + 2]].map((v) => Math.min(1, (v / 255) * BRIGHTEN));
    const grey = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    for (let k = 0; k < 3; k++) {
      const v = Math.min(1, Math.max(0, grey + (c[k] - grey) * SATURATE));
      out[i + k] = (Math.min(LEVELS, Math.max(0, Math.floor(v * LEVELS + 0.5 + n))) / LEVELS) * 255;
    }
    out[i + 3] = 255;
  }
  ctx.putImageData(new ImageData(out, w, hgt), 0, 0);
}
