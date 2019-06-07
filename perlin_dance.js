// CHECK WEBGL VERSION
if ( WEBGL.isWebGL2Available() === false ) {
  document.body.appendChild( WEBGL.getWebGL2ErrorMessage() );
}

// SETUP RENDERER & SCENE
const container = document.createElement( 'div' );
document.body.appendChild( container );
 
const canvas = document.createElement("canvas");
window.setTimeout(startNow, 1000);
function startNow () {
  canvas.style.display = 'block';  
}

const context = canvas.getContext( 'webgl2' );
const renderer = new THREE.WebGLRenderer( { canvas: canvas, context: context } );
container.appendChild( renderer.domElement );
const scene = new THREE.Scene();

// LIGHTS
const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.3 );
hemiLight.position.set( 0, 500, 0 );
scene.add( hemiLight );

const dirLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
dirLight.position.set( -1, 0.75, 1 );
dirLight.position.multiplyScalar( 50);
dirLight.name = "dirlight";

scene.add( dirLight );

dirLight.castShadow = true;
dirLight.shadow.mapSize.width = dirLight.shadow.mapSize.height = 1024*2;

let d = 300;

dirLight.shadow.camera.Left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

dirLight.shadow.camera.far = 3500;
dirLight.shadow.bias = -0.0001;
dirLight.shadow.darkness = 0.35;

// SKYBOX CONSTRUCTION
let cubeTexture = new THREE.CubeTextureLoader()
.setPath('images/skybox/')
.load([
  'mercury_ft.jpg',
  'mercury_bk.jpg',
  'mercury_up.jpg',
  'mercury_dn.jpg',
  'mercury_rt.jpg',
  'mercury_lf.jpg',
]);
cubeTexture.format = THREE.RGBFormat;

scene.background = cubeTexture;
  
// SETUP CAMERA
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.x = 0;
camera.position.y = 15;
camera.position.z = 50;
camera.up = new THREE.Vector3(0,1,0);
camera.lookAt(new THREE.Vector3(0, 10, 0));

// SETUP ORBIT CONTROLS OF THE CAMERA
const controls = new THREE.OrbitControls(camera);
controls.damping = 0.2;
controls.autoRotate = false;
controls.keys = { LEFT: 65, UP: 87, RIGHT: 68, BOTTOM: 83};
controls.mouseButtons['ORBIT'] = THREE.MOUSE.MIDDLE;
controls.noZoom = true;
 
// ADAPT TO WINDOW RESIZE
function resize() {
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
}
 
// EVENT LISTENER RESIZE
window.addEventListener('resize',resize);
resize();

// ADD TEXTURE LOADER
const textureLoader = new THREE.TextureLoader();

// ADD SCENE TERRAIN
const DEPTH = 30;
const WIDTH = 200, LENGTH = 200
const RECT_WIDTH = 4, RECT_LENGTH = 4;
const TERR_WIDTH = WIDTH * RECT_WIDTH, TERR_LENGTH = LENGTH * RECT_LENGTH;

const numSlots = 4*WIDTH*LENGTH
let fireSlots = [null*numSlots];

const terrainGeometry = new THREE.PlaneBufferGeometry(TERR_WIDTH, TERR_LENGTH, WIDTH, LENGTH);
const terrainTexture = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    map: new textureLoader.load('images/floor.jpg')
	})
const terrain = new THREE.Mesh(terrainGeometry, terrainTexture);
terrain.rotation.x = -Math.PI / 2;
terrain.position.y = -DEPTH;
terrain.updateMatrix();
scene.add(terrain);
terrain.matrixAutoUpdate = false;

// PERLIN NOISE
const peak = 30;
const smoothing = 300;
const vertices = terrain.geometry.attributes.position.array;
const perlin = new SimplexNoise()
for (let i = 0; i <= vertices.length; i += 3) {
    vertices[i+2] = peak * perlin.noise(
        vertices[i]/smoothing, 
        vertices[i+1]/smoothing
    );
}
terrain.geometry.attributes.position.needsUpdate = true;
terrain.geometry.computeVertexNormals();

// RANDOM FIRE DISTRIBUTION
const fireTex = textureLoader.load('images/fire.png');

const FOCUS_PROB = 0.99;
const focuses = new Array();

for (let i = 0; i <= vertices.length; i+=3) {
  let prob = Math.random();
  if (prob > FOCUS_PROB) {
    let fire = new THREE.Fire(fireTex, new THREE.BoxBufferGeometry(1.0, 1.0, 1.0));

    fire.scale.multiplyScalar(20);
    fire.position.x = vertices[i];
    fire.position.y = vertices[i+2] - DEPTH;
    fire.position.z = vertices[i+1];
    fire.matrixAutoUpdate = false;
    fire.updateMatrix();
    focuses.push(fire);
    scene.add(fire);
  }
}

// MOUSE INTERACTION
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2(-1000,-1000);
let nmouse = new THREE.Vector2(-1000,-1000);

function updateCursor() {
	let width=window.innerWidth;
	let height=window.innerHeight;

	// Calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components
	nmouse.x = ( event.clientX / width ) * 2 - 1;
	nmouse.y = - ( event.clientY / height ) * 2 + 1;
	
	mouse.x = event.clientX -width/2
	mouse.y = -event.clientY + height/2

	raycaster.setFromCamera( nmouse, camera );
}

// ADD FIRE BY USER CLICK
let timer; 
function ignite(event) {
  if (event.button == 0) {
    let intersects = raycaster.intersectObject(terrain);
    for (let i = 0; i < intersects.length; i++) {
      let faceIndex = intersects[i].faceIndex;
      if (!fireSlots[faceIndex]) {
        let fire = new THREE.Fire(fireTex, new THREE.BoxBufferGeometry(1.0, 1.0, 1.0));
        
        fire.scale.multiplyScalar(20);
        fire.position.x = intersects[i].point.x;
        fire.position.y = intersects[i].point.y;
        fire.position.z = intersects[i].point.z;
        fire.matrixAutoUpdate = false;
        fire.updateMatrix();
        fireSlots[faceIndex] = fire;
        scene.add(fireSlots[faceIndex]);
      } 
    }
  }
}

window.addEventListener('mousemove', updateCursor, false );
window.addEventListener('mousedown', function(event){
    timer = setInterval(() => { ignite(event) }, 10);
  }, false);
window.addEventListener('mouseup', function(){ 
    if (timer) {
      clearInterval(timer);
    }
  }, false);

// LOAD OBJ ASSET (SHAKE THAT BOOTY)
const objLoader = new THREE.FBXLoader();
const dancer = new THREE.Object3D();
let mixers = new Array();
objLoader.load('adolf-twerk/source/adolf_full.fbx',
	function (object) {
    dancer.add(object);
    dancer.scale.multiplyScalar(0.5);
    dancer.position.y = -DEPTH;
    console.log(object);
  
    // Create an AnimationMixer, and get the list of AnimationClip instances
    mixer = new THREE.AnimationMixer(object);
    console.log(mixer);
    mixer.clipAction(object.animations[0]).play();
    mixers.push(mixer);
  }, 
  undefined,
  function (error) {
    console.log(error);
  }
);
scene.add(dancer);

// create an AudioListener and add it to the camera
var listener = new THREE.AudioListener();
camera.add( listener );

// create a global audio source
var sound = new THREE.Audio( listener );

// load a sound and set it as the Audio object's buffer
var audioLoader = new THREE.AudioLoader();
audioLoader.load( 'sounds/macarena.ogg', function( buffer ) {
	sound.setBuffer( buffer );
	sound.setLoop( true );
	sound.setVolume( 0.4 );
	sound.play();
});

// SETUP UPDATE CALL-BACK
const clock = new THREE.Clock();

(function update() {
  for (i=0; i < mixers.length; i++) {
    mixer.update(clock.getDelta());
  }
  let t = clock.elapsedTime;
  for (let i = 0; i < numSlots; i++) {
    if (fireSlots[i]){
      fireSlots[i].update(t);
    }
  }
  for (let i = 0; i < focuses.length; i++) {
    focuses[i].update(t);
  }
  controls.update()
  renderer.render(scene, camera);
  requestAnimationFrame(update);
})();
