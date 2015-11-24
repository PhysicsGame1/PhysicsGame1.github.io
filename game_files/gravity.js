var canvas = document.getElementById("physicsCanvas");

var Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body
    Events = Matter.Events
    Runner = Matter.Runner;


// Set up renderer and engine options (see link for more options)
// https://github.com/liabru/matter-js/wiki/Rendering
var engine = Engine.create({render:
	{
		canvas: canvas,         // render on this canvas
		options: {
			background: 'black',
			wireframes: false,    // Do not render wireframes
			showVelocity: true,   // Show velocity vectors
			showCollisions: false,  // Show collision vectors
			showIds: true,
      hasBounds: true,
      width: canvas.width,
      height: canvas.height
		}
}});


// This is a hack to prevent physics from stopping at the edges of the canvas
// source: https://github.com/liabru/matter-js/issues/67
engine.world.bounds.min.x = -Infinity;
engine.world.bounds.min.y = -Infinity;
engine.world.bounds.max.x = Infinity;
engine.world.bounds.max.y = Infinity;

engine.world.gravity.y = 0;
engine.positionIterations = 12;

Events.on(engine, 'afterRender', afterRender);
Events.on(engine, 'beforeUpdate', beforeUpdate);
Events.on(engine, 'collisionEnd', collisionEnd);
window.addEventListener("keydown", keydown);
window.addEventListener("keyup", keyup);

var fps; //used for the fps

function createSimulation2()
{
  sizeMult = 6;
  var speed = 5;
  var minx = engine.render.bounds.min.x;
  var miny = engine.render.bounds.min.y;
  var maxx = engine.render.bounds.max.x;
  var maxy = engine.render.bounds.max.y; 
  
  // Three for the elves
  for (i = 0; i < 3; i++)
  {
    var obj = createBody(rand(minx, maxx), rand(miny, maxy), rand(150, 300));
    Body.setVelocity(obj, {x:rand(-speed, speed), y:rand(-speed, speed)});
  }
  // Seven for the dwarves
  for (i = 0; i < 7; i++)
  {
    var obj = createBody(rand(minx, maxx), rand(miny, maxy), rand(75, 125));
    Body.setVelocity(obj, {x:rand(-speed, speed), y:rand(-speed, speed)});
  }
  // Nine for men
  for (i = 0; i < 9; i++)
  {
    var obj = createBody(rand(minx, maxx), rand(miny, maxy), rand(40, 70));
    Body.setVelocity(obj, {x:rand(-speed, speed), y:rand(-speed, speed)});
  }
  // And one to rule them all
  createBody(minx + (maxx - minx) / 2, miny + (maxy - miny) / 2, 10000);

  fps = Engine.run(engine);
}

function createSimulation()
{
  sizeMult = 1;
  bodyGroup = 1;
  // "star"
  var x = canvas.width / 2;
  var y = canvas.height / 2;
  var obj = createBody(x, y, 10000);
  Body.setVelocity(obj, {x:0, y:-0.2});
 
  // "planet" 
  x -= 700;
  obj = createBody(x, y, 200);
  Body.setVelocity(obj, {x:0, y:8});
  
  // "moon"
  y += 44;
  x += 22;
  obj = createBody(x, y, 20);
  Body.setVelocity(obj, {x:4.446, y:8.015});
  
  moveZoom(-1.40);
  fps = Engine.run(engine);
}




/************************************
 * addEventListener handlers
 ************************************/
var keys_currently_down = {};
function keydown(event)
{
  console.log("Keydown: " + event.keyCode);
  keys_currently_down[event.keyCode] = true;
}

function keyup(event)
{
  console.log("Keyup:   " + event.keyCode);
  keys_currently_down[event.keyCode] = false;
}

/************************************
 * Matter JS event handlers
 ************************************/

function beforeUpdate(event)
{
  // Apply camera transformations
  // It is better to move the camera here, rather than directly in keydown()
  // beforeUpdate is called more often, allowing for smoother movement
  // and the all keys currently pressed can be tracked (allows movement in multiple directions)
  var timingMult = 0.001 * fps.delta;
  var cameraSpeed = timingMult * 300 * zoom;
  var zoomSpeed = timingMult * 1.33;
  for (k in keys_currently_down)
  {
    if (keys_currently_down[k] == false)
      continue;
    if (k == 65) // a
      moveCamera(-cameraSpeed, 0);
    if (k == 87) // w
      moveCamera(0, -cameraSpeed);
    if (k == 68) // d
      moveCamera(cameraSpeed, 0);
    if (k == 83) // s
      moveCamera(0, cameraSpeed);
    if (k == 81) // q
      moveZoom(-zoomSpeed);
    if (k == 69) // e
      moveZoom(zoomSpeed);
  }

  // Apply gravity to all bodies
	for (i in engine.world.bodies)
	{
		var netForce = {x:0, y:0};
		var objA = engine.world.bodies[i];
		if (objA.isStatic)
			continue;
		for (j in engine.world.bodies)
		{
			var objB = engine.world.bodies[j];
			if (objB.isStatic)
				continue;
			var g = gravity(objA, objB);
			netForce.x += g.x; netForce.y += g.y;
		}
		objA.force = netForce;
	}  
}


function afterRender(event)
{
	engine.render.context.font = '16px Consolas';
	engine.render.context.fillStyle = 'white';
	engine.render.context.fillText("Framerate: " + round(fps.fps, 1), 20, 20);
  engine.render.context.fillText("CameraPos: " + round(cameraX, 4) + ", " + round(cameraY, 4), 20, 40);
  engine.render.context.fillText("CameraZoom: " + round(zoom,4), 20, 60);
}

function collisionEnd(event)
{
	// Goal: Combine all objects involved in this collision into one large object
  
  // Determine all bodies involved with the collision
	var bodies = {};
	for(k in event.pairs)
	{
		var a = event.pairs[k].bodyA;
		var b = event.pairs[k].bodyB;
		if (a.isStatic || b.isStatic)
			continue;
		bodies[a.id] = a;
		bodies[b.id] = b;
	}
  
  // Calculate properties of combined body, and remove old bodies from simulation
  var totalEnergyX = 0; var totalEnergyY = 0;
	var totalMass = 0;
  var maxMass = 0; var maxPos;
	for(k in bodies)
	{
		var b = bodies[k];
		totalMass += b.mass;
    totalEnergyX += b.mass * b.velocity.x;
    totalEnergyY += b.mass * b.velocity.y;
    if (b.mass > maxMass)
    {
      maxPos = b.position;
      maxMass = b.mass;
    }
		Matter.Composite.removeBody(engine.world, b);
	}  
	if (totalMass == 0)
    return;
	// Create and set the new body in motion
  
  // The engine freaks out hard if I create a body here, so here is another hack to let the function end
  // and have the engine do its thing before creating the new body
  window.setTimeout(function() { 
      var b = createBody(maxPos.x, maxPos.y, totalMass);
      Body.setVelocity(b, {x:totalEnergyX / totalMass, y:totalEnergyY / totalMass});
    }, 10);
}

/************************************
 * Camera functions
 ************************************/

 zoom = 2.5;   // Default zoom
function moveZoom(zoomOffset)
{
  zoom += zoomOffset;
  console.log(zoomOffset);
  if (zoom < 0.1)
    zoom = 0.1;
  if (zoom > 10)
    zoom = 10;
  updateCamera();
}

function moveCamera(xOffset, yOffset)
{
  cameraX += xOffset; cameraY += yOffset;
  updateCamera();
}

// Default camera position
cameraX = canvas.width / 2; cameraY = canvas.height / 2;
function setCamera(x, y)
{
  cameraX = x; cameraY = y;
  updateCamera()
}

function updateCamera()
{
  engine.render.bounds.min.x = cameraX - canvas.width * zoom;
  engine.render.bounds.min.y = cameraY - canvas.height * zoom;
  engine.render.bounds.max.x = cameraX + canvas.width * zoom;
  engine.render.bounds.max.y = cameraY + canvas.height * zoom;
}
// Run once to set initial values
updateCamera();

/************************************
 * Misc. functions
 ************************************/
function rand(min, max)
{
  return min+(max-min)*Math.random();
}

function round(n, places)
{
  var x = Math.pow(10, places);
  return Math.round(n*x)/x;
}

// Compute and return the force of gravity (between a<->b) to be applied on object a
function gravity(a, b)
{
	var G = 0.019;
	var dx = b.position.x - a.position.x;
	var dy = b.position.y - a.position.y;
	var dxdy = dx*dx + dy*dy;
	if (dxdy == 0)
		return {x:0, y:0};
	if (Matter.Bounds.overlaps(a.bounds, b.bounds))
	{
		//console.log("No gravity");
		return {x:0, y:0};
	}
	
	var d = Math.sqrt(dxdy);
	var force = G * a.mass * b.mass / d;
	var forceX = force * Math.abs(dx) / dxdy;
	var forceY = force * Math.abs(dy) / dxdy;
	return {x: dx > 0 ? forceX : -forceX, y: dy > 0 ? forceY : -forceY};
}

// Creates a circe
var bodyGroup = 0;
var sizeMult = 4;
function createBody(x, y, mass)
{
	var size = sizeMult*Math.log(mass);
	var obj = Bodies.circle(x, y, size, {groupId:bodyGroup, frictionAir: 0, friction: 0
			, mass: mass, restitution:1, render:{sprite:{texture:'images/cl.png'
      , xScale: size/100, yScale: size/100}}})
	World.add(engine.world, [obj]);
	return obj;
}

// Run simulation
createSimulation();