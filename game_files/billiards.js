var canvas = document.getElementById("physicsCanvas");

var Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body
    Events = Matter.Events;


// Set up renderer and engine options (see link for more options)
// https://github.com/liabru/matter-js/wiki/Rendering
var engine = Engine.create({render:
	{
		canvas: canvas,         // render on this canvas
		options: {
			wireframes: false,    // Do not render wireframes
			showVelocity: false,   // Show velocity vectors
			showCollisions: false  // Show collision vectors
		}
}});


// This is a hack to prevent physics from stopping at the edges of the canvas
// source: https://github.com/liabru/matter-js/issues/67
engine.world.bounds.min.x = -Infinity;
engine.world.bounds.min.y = -Infinity;
engine.world.bounds.max.x = Infinity;
engine.world.bounds.max.y = Infinity;

engine.world.gravity.y = 0;

// Set up callbacks for event handling
Events.on(engine, 'mousedown', mousedown);
Events.on(engine, 'afterRender', afterRender);
Events.on(engine, 'afterUpdate', afterUpdate);

var A = [];

// Create the world borders
var borderThickness = 100;  // Actual thickness of border (thicker means less chance of clipping through at high speeds)
var borderVisible = 20;     // Thickness of border onscreen
var borderOffset = (borderThickness - borderVisible) / 2;
A.push(Bodies.rectangle(canvas.width / 2, canvas.height + borderOffset, canvas.width, borderThickness, { isStatic: true, render:{fillStyle: 'green'} })); // bottom
A.push(Bodies.rectangle(canvas.width / 2, -borderOffset, canvas.width, borderThickness, { isStatic: true, render:{fillStyle: 'blue'}}));   // top
A.push(Bodies.rectangle(-borderOffset, canvas.height / 2, borderThickness, canvas.height, { isStatic: true, render:{fillStyle: 'blue'}}));  // left
A.push(Bodies.rectangle(canvas.width + borderOffset, canvas.height / 2, borderThickness, canvas.height, { isStatic: true, render:{fillStyle: 'blue'}}));  // right


var ball = Bodies.circle(40, 360, 10, { frictionAir: 0.015, density: .19, restitution:1.5, render:{sprite:{texture:'images/10ball.png', xScale: 0.5, yScale: 0.5}, fillStyle: 'white'}});
A.push(ball);

var colors = ['yellow', 'blue', 'red', 'purple', 'orange', 'green', 'brown', 'black', 'gray', 'gray', 'gray', 'gray', 'gray', 'gray', 'gray'];

var y = 0;
var x = 0;
for (k in colors)
{
	A.push(Bodies.circle(700 + x, 300 + y, 10, {frictionAir: 0.015, density: 0.19, restitution:1.0, render:{fillStyle: colors[k]}}));
	y += 20;
	if (y == 100 && x == 0)
	{
		x -= 20;
		y = 10;
	}
	if (y == 90 && x == -20)
	{
		x -= 20;
		y = 20;
	}
	if (y == 80 && x == -40)
	{
		x -= 20;
		y = 30;
	}
	if (y == 70 && x == -60)
	{
		x -= 20;
		y = 40;
	}
}






// add all of the bodies to the world
World.add(engine.world, A);

// run the engine
Engine.run(engine);

// Pull the ball towards the mouse when the user clicks
function mousedown(event)
{
  // Calculate a vector pointing from the ball to the mouse
  var deltaX = event.mouse.mousedownPosition.x - ball.position.x;
  var deltaY = event.mouse.mousedownPosition.y - ball.position.y;
  var vecLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  var forceX = deltaX / vecLength * 6;
  var forceY = deltaY / vecLength * 6;

  //console.log(forceX + ", " + forceY);
  // Apply that vector as a force
	Body.applyForce(ball, {x:ball.position.x, y:ball.position.y}, {x:forceX, y:forceY});
}

// Draw FPS on the canvas
function afterRender(event)
{
	engine.render.context.font = '20px Consolas';
	engine.render.context.fillStyle = 'black';
	engine.render.context.fillText(Math.round(engine.timing.fps*10)/10, 40, 40);
	
	render_variables();
}

// A hack to force the ball back into the canvas if it clips through the borders
function afterUpdate(event)
{
	if(ball != null){
	var bx = ball.position.x, by = ball.position.y;
	if (bx < 0)
		Body.translate(ball, {x:50 - bx, y:0});
	if (by > canvas.width)
		Body.translate(ball, {x:canvas.width - 50 - bx, y:0});
	if (by < 0)
		Body.translate(ball, {x:0, y:50 - by});
	if (by > canvas.height)
		Body.translate(ball, {x:0, y:canvas.height - 50 - by});
	
	if (bx != ball.position.x || by != ball.position.y)
		console.log("ball moved onscreen");
	}
}