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
camera.position.y = 0;
camera.position.z = 20;
camera.up = new THREE.Vector3(0,1,0);
camera.lookAt(new THREE.Vector3(0, 0, 0));

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

// ADD TEXTURE LOADER
const textureLoader = new THREE.TextureLoader();

// ADD SCENE TERRAIN
const terrainGeometry = new THREE.PlaneGeometry();

const WIDTH = 1, LENGTH = 1
const RECT_WIDTH = 5, RECT_LENGTH = 5;
const TERR_WIDTH = WIDTH * RECT_WIDTH, TERR_LENGTH = LENGTH * RECT_LENGTH;

let fires = []

function FirePlace(h = [0.0, 0.0, 0.0, 0.0]) {
    // ADD VERTEXES
    for (i=0; i<WIDTH; i++) {
        for (j=0; j<LENGTH; j++) {
            terrainGeometry.vertices.push(new THREE.Vector3(RECT_WIDTH*(i-WIDTH/2), 
                                                            h[i*LENGTH+j],
                                                            RECT_LENGTH*(j-LENGTH/2))),
            terrainGeometry.colors.push(new THREE.Color(0xff0000)) 
        }
    }

    // ADD FACES AND UVS
    terrainGeometry.faceVertexUvs= new Array()
    terrainGeometry.faceVertexUvs.push(new Array())
    
    for (i=0; i<WIDTH-1; i++) {
    for (j=0; j<LENGTH-1; j++) {
        face = new THREE.Face3(i*LENGTH+j, i*WIDTH+j+1, 
        i*LENGTH+j+LENGTH)
        terrainGeometry.faces.push(face)
        face.vertexColors[0]=terrainGeometry.colors[i*LENGTH+j];
        face.vertexColors[1]=terrainGeometry.colors[i*LENGTH+j+1];
        face.vertexColors[2]=terrainGeometry.colors[i*LENGTH+j+LENGTH];

        terrainGeometry.faceVertexUvs[0].push( [
            new THREE.Vector2(i/WIDTH,j/LENGTH),
            new THREE.Vector2(i/WIDTH,(j+1)/LENGTH),
            new THREE.Vector2((i+1)/WIDTH,j/LENGTH),]
        )
        
        face = new THREE.Face3(i*LENGTH+j+LENGTH+1,  i*LENGTH+j+LENGTH, 
        i*LENGTH+j+1,)
        terrainGeometry.faces.push(face)
        
        terrainGeometry.faceVertexUvs[0].push( [
            new THREE.Vector2((i+1)/WIDTH,(j+1)/LENGTH),
            new THREE.Vector2((i+1)/WIDTH,(j)/LENGTH),
            new THREE.Vector2((i)/WIDTH,(j+1)/LENGTH),]
        )
    }
    }

    terrainGeometry.computeFaceNormals()
    terrainGeometry.computeVertexNormals()
        
    const terrain = new THREE.Mesh(terrainGeometry, 
    new THREE.MeshBasicMaterial({
        vertexColors: THREE.VertexColors,
        flatShading: true,
        side: THREE.DoubleSide,
        //color:0x00f5f5,
        map: new textureLoader.load('images/floor.jpg'),
        }));

    terrain.matrixAutoUpdate = false;

    // ADD FIRE BOX
    const FIRE_HEIGHT = 10;
    const fireTex = textureLoader.load('images/fire.png');
    const fireGeometry = new THREE.Geometry();
    for (let i=0; i < terrainGeometry.faces.length; i++) {
        let auxGeometry = new THREE.Geometry();
        let face = terrainGeometry.faces[i];
        console.log(face)
        let a = terrainGeometry.vertices[face.a].clone();
        let b = terrainGeometry.vertices[face.b].clone();
        let c = terrainGeometry.vertices[face.c].clone();
        auxGeometry.vertices.push([a, b, c]);

        let ah = a.clone();
        ah.y += FIRE_HEIGHT;    
        let bh = b.clone();
        bh.y += FIRE_HEIGHT;    
        let ch = c.clone();
        ch.y += FIRE_HEIGHT;
        auxGeometry.vertices.push([ah, bh, ch]);

        auxGeometry.faces.push(new THREE.Face3(0, 1, 2));
        auxGeometry.faces.push(new THREE.Face3(0, 1, 3));
        auxGeometry.faces.push(new THREE.Face3(1, 3, 4));
        auxGeometry.faces.push(new THREE.Face3(1, 2, 4));
        auxGeometry.faces.push(new THREE.Face3(2, 4, 5));
        auxGeometry.faces.push(new THREE.Face3(2, 0, 5));
        auxGeometry.faces.push(new THREE.Face3(0, 5, 3));
        auxGeometry.faces.push(new THREE.Face3(3, 4, 5));

        auxGeometry.computeFaceNormals();
        auxGeometry.computeVertexNormals();
        
        fireGeometry.mergeMesh(new THREE.Mesh(auxGeometry));
        fireGeometry.mergeVertices();
    }

    const fire = new THREE.Fire(fireTex, fireGeometry);
    const wireframe = new THREE.Mesh(fireGeometry, new THREE.Mesh(fire.geometry, wireframeMat.clone()) );
    fire.add(wireframe);
    wireframe.visible = true;

    let firePlace = new Object3D();
    firePlace.add(terrain);
    firePlace.add(fire);
    fires.push(fire);
    return firePlace;
}

const firePlaces = [null*3];
firePlaces[0] = new FirePlace();
firePlaces[1] = new FirePlace([-5.0, -5.0, 5.0, 5.0]);
firePlaces[2] = new FirePlace([5.0, 5.0, -5.0, -5.0]);

scene.add(firePlaces);

const axesHelper = new THREE.AxesHelper(5);
scene.add( axesHelper );

// SETUP UPDATE CALL-BACK
const clock = new THREE.Clock();

(function update() {
  //let t = 0.2 * Date.now();
  clock.getDelta();
  let t = clock.elapsedTime;
  for (let i = 0; i < fires.length; i++) {
    fires[i].update(t)  
  }
  
  renderer.render(scene, camera);
  requestAnimationFrame(update);
})();
