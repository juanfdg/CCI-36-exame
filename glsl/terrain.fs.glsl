uniform float uTime;
uniform float uX;
uniform float uY;
uniform float uZ;

varying vec2 vUv;

// colors
const vec3 SKY_COL = vec3(0.76,0.94, 1.0);
const vec3 MTN_COL = vec3(0.4, 0.2, 0.0);
const vec3 ICE_COL = vec3(0.9, 0.9, 1.0);
const vec3 LIGHT_COL = vec3(0.95, 1.0, 0.89); // white, slightly yellow light

const float FOG_DENSITY = -0.04;
const float SKY = -1.0; // materialID for sky
const vec3 EPS = vec3(0.001, 0.0, 0.0); // smaller values = more detail when normalizing
const float MAX_DIST = 60.0; // used when ray casting to limit ray length
const int RAYS = 30; // number of rays cast, set lower if framerate slows
const int FREQUENCY = 15; // try lower values if framerate issues encountered

// the following are used in terrain function
const float START_HEIGHT = 0.4;
const float WEIGHT = 0.6;
const float MULT = 0.35;

// Simple 2d noise algorithm from http://shadertoy.wikia.com/wiki/Noise
float noise( vec2 position ) {
  vec2 f = fract(position);
  position = floor(position);
  float v = position.x+position.y*1000.0;
  vec4 r = vec4(v, v+1.0, v+1000.0, v+1001.0);
  r = fract(10000.0*sin(r*.001));
  f = f*f*(3.0-2.0*f);
  return 2.0*(mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y))-1.0;
}

// Generate terrain using above noise algorithm
float terrain(vec2 position, int freq) {
  float height = START_HEIGHT;
  float weight = WEIGHT;
  float multiplier = MULT;
  for (int i = 0; i < freq; i++) {
    height += weight * noise(position * multiplier) * noise(vec2(uTime/1.5));
    weight *= 0.5;
    multiplier *= 2.0;
  }
  return height;
}

// this function determines how to colour, based on y.pos 
// out of the 3 basics SKY, MTN, ICE, assigns -1.0, 0.0 or 1.0
vec2 map(vec3 position, int octaves) {
  float dMin = MAX_DIST; // nearest intersection
  float depth;
  float materialID = SKY;

  float height = terrain(position.xz, octaves);
  depth = position.y - height;
  if (depth < dMin) { 
    dMin = depth;
    materialID = 0.0;
  }

  float s = 0.05;
  depth = position.y - s;	
  if (depth < dMin) { 
    dMin = depth;
    materialID = 1.0;
  }

  return vec2(dMin, materialID);
}

// ray casting funciton. ro = ray origin, rd = ray direction
// returns materialID
vec2 castRay( vec3 originRay, vec3 directionRay, int freq) {
  float dist = 0.0;   // distance
  float delta = 0.2;  // step
  float material = -1.0;
  for (int i = 0; i < RAYS; i++) {
    if (dist < MAX_DIST ) {	// ignore if 'sky'
      dist += delta; 		// next step
      vec2 result = map(originRay + directionRay*dist, freq); // get intersection
      delta = result.x; 
      material = result.y; // set material id based on y pos
    } 
    else break; //ignore 'sky'
  }
  if (dist > MAX_DIST) material = SKY; // if nothing intersects set as sky
  return vec2(dist, material);
}

// calculates normal, try changing epsilon constant
vec3 calcNormal( vec3 p, int freq) {
  return normalize( vec3(map(p + EPS.xyy, freq).x - map(p-EPS.xyy, freq).x,
        map(p+EPS.yxy, freq).x - map(p-EPS.yxy, freq).x,
        map(p+EPS.yyx, freq).x - map(p-EPS.yyx, freq).x) );
}

vec3 render(vec3 originRay, vec3 directionRay) {
  const int freq = FREQUENCY;

  vec3 color = SKY_COL; // base color is sky color
  vec2 res = castRay(originRay, directionRay, freq);

  vec3 lightPos = normalize( vec3(1.0, 0.9, 0.0) ); // light position

  vec3 position = originRay + directionRay*res.x; // world position

  // material  = sky
  if (res.y < -0.5) {
    color = SKY_COL;
    return color;
  }
  // now we can calculate normals for moutnains and ice
  vec3 normal = calcNormal(position, 10);

  // material = MTN 
  if (res.y > -0.5 && res.y < 0.5 ) {
    color = MTN_COL;
    // add light
    float ambient = clamp( 0.5 + 0.5 * normal.y, 0.0, 1.0); // ambient
    float diffuse = clamp( dot( normal, lightPos ), 0.0, 5.0); // diffuse
    color += (0.4 * ambient) * LIGHT_COL;
    color *= (1.9 * diffuse) * LIGHT_COL;	
  }
  // material = ICE
  if (res.y > 0.5) {
    color = ICE_COL;

    float ambient = clamp(0.5 + 0.5 * normal.y, 0.0, 1.0);     // ambient
    float diffuse = clamp(dot(normal, lightPos), 0.0, 2.0);  // diffuse

    color += (0.3 * ambient) * LIGHT_COL;
    color *= (2.1 * diffuse) * LIGHT_COL;
  }

  // fog from http://in2gpu.com/2014/07/22/create-fog-shader/
  float fog = exp(FOG_DENSITY * res.x); 
  color = mix(vec3(0.3,0.3,0.35), color, fog); 

  return color;
}

void main() {
  vec2 position = 2.0 * vUv - 1.0;
  const vec3 up = vec3(0.0, 1.0, 0.0); // up vector
  vec3 viewPosition = vec3(uX, uY, uZ);
  vec3 cameraLook = vec3(viewPosition.x + 1.0, viewPosition.y*0.8, 0.0);

  vec3 w = normalize(cameraLook - cameraPosition);
  vec3 u = normalize(cross(w, up));
  vec3 v = normalize(cross(u, w));

  vec3 directionRay = normalize(position.x*u + position.y*v + 2.0*w);

  vec3 color = render(viewPosition, directionRay);

  gl_FragColor = vec4(color, 1.0);
}
