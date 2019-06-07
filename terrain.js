// CHECK WEBGL VERSION
if ( WEBGL.isWebGL2Available() === false ) {
  document.body.appendChild( WEBGL.getWebGL2ErrorMessage() );
}
 
// SETUP RENDERER & SCENE
const container = document.createElement( 'div' );
document.body.appendChild( container );
 
const canvas = document.createElement('canvas');
const context = canvas.getContext('webgl2');
const renderer = new THREE.WebGLRenderer({canvas: canvas, context: context});
renderer.setClearColor(0X111111);
container.appendChild( renderer.domElement );
const scene = new THREE.Scene();

// SETUP CAMERA
const camera = new THREE.PerspectiveCamera(30,1,0.1,1000); // view angle, aspect ratio, near, far
camera.position.set(45,20,40);
camera.lookAt(scene.position);
scene.add(camera);
 
// SETUP ORBIT CONTROLS OF THE CAMERA
const controls = new THREE.OrbitControls(camera);
controls.damping = 0.2;
controls.autoRotate = false;
 
// ADAPT TO WINDOW RESIZE
function resize() {
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
}
 
// EVENT LISTENER RESIZE
window.addEventListener('resize',resize);
resize();
 
//SCROLLBAR FUNCTION DISABLE
window.onscroll = function () {
     window.scrollTo(0,0);
};

// WORLD COORDINATE FRAME: other objects are defined with respect to it
const worldFrame = new THREE.AxesHelper(5) ;
worldFrame.visible = false;
scene.add(worldFrame);
 
// MATERIALS: specifying uniforms and shaders
const terrainMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: {type: 'f', value: 0.0},
    uX: {type: 'f', value: 0.0},
    uY: {type: 'f', value: 1.0},
    uZ: {type: 'f', value: 0.0},
  }
});

// LOAD SHADERS
shaderFiles = [
  'glsl/terrain.vs.glsl',
  'glsl/terrain.fs.glsl'
]
new THREE.SourceLoader().load(shaderFiles, shaders => {
  terrainMaterial.vertexShader = shaders['glsl/terrain.vs.glsl'];
  terrainMaterial.fragmentShader = shaders['glsl/terrain.fs.glsl'];
  console.log(terrainMaterial);
});

const terrainGeometry = new THREE.PlaneGeometry(16, 9);
const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.parent = worldFrame;
scene.add(terrain);
console.log(terrain);

// MONITOR
monitor = null;
new THREE.OBJLoader().load(
    'obj/monitor.obj',
    object => {
      monitor = object;
      monitor.scale.setScalar(0.27);
      monitor.position.set(-35.1,-8,37.9);
      scene.add(object);
    },
    xhr => console.log(`${xhr.loaded / xhr.total * 100}% loaded`),
    error => console.log(`Error: ${error}`));

// LISTEN TO KEYBOARD
const keyboard = new THREEx.KeyboardState();
function checkKeyboard() {
  if (keyboard.pressed("Q"))
    terrainMaterial.uniforms.uY.value += 0.02;
  else if (keyboard.pressed("E"))
    terrainMaterial.uniforms.uY.value -= 0.02;
 
  if (keyboard.pressed("A"))
    terrainMaterial.uniforms.uX.value -= 0.02;
  else if (keyboard.pressed("D"))
    terrainMaterial.uniforms.uX.value += 0.02;

  if (keyboard.pressed("W"))
    terrainMaterial.uniforms.uZ.value -= 0.02;
  else if (keyboard.pressed("S"))
    terrainMaterial.uniforms.uZ.value += 0.02;
}

// SETUP UPDATE CALL-BACK
const startTime = Date.now();

(function update() {
  checkKeyboard();
  terrainMaterial.uniforms.uTime.value = (Date.now()-startTime)/1000.;
  terrainMaterial.needsUpdate = true;
  requestAnimationFrame(update);
  renderer.render(scene, camera);
})();
