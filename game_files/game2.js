/***********************************************************************
 *                      Global definitions
 ***********************************************************************/
var DEBUG = true;		// Set to true to enable various features for testing
var START_LEVEL = 0;	// This level will be run when the game starts

var canvas = document.getElementById("physicsCanvas");
var ctx = canvas.getContext("2d");

var Engine = Matter.Engine,								//manages updating and rendering canvas
		World = Matter.World,							//composite of entire canvas
		Bodies = Matter.Bodies,							//used to create shapes within canvas
		Body = Matter.Body,								//used to manipulated created bodies in canvas
		Events = Matter.Events,							//used for mouse events like mousdown, mousemove, and mouseup
		Composite = Matter.Composite,					//to clear constraints from the ball before fired and modify composites (remove doesn't work?!)
		Composites = Matter.Composites,					//used to build composites (combining lots of shapes into structures like walls etc)
		MouseConstraint = Matter.MouseConstraint,		//mouse events must go through mouseconstraint instead of engine now
		Vector = Matter.Vector;							//for vector algebra


// Set up renderer and engine options (see link for more options)
// TODO: We are getting a warning saying element is undefined. It is set to null by default. What element should we tie it to? The API says it's optional but still
// https://github.com/liabru/matter-js/wiki/Rendering
var engine = Engine.create({
	enableSleeping: false,			// Stop performing physics on idle bodies
	render:	{
		canvas: canvas,				// Render on this canvas
		options: {
			wireframes: false,		// Do not render wireframes
			showVelocity: false,	// Show velocity vectors
			showCollisions: false,	// Show collision vectors
			showSleeping: false,	// Do not do special rendering for sleeping bodies
			width:1000,
			height:600
		}
}});

var STATE_PRE_INIT = 0;
var STATE_AFTER_INIT = 100;
var STATE_MOUSEUP = 200;
var STATE_MOUSEDOWN = 201
var STATE_GAME_WON = 400;

// Tracks the current state of the game
var current_state;

// Contains functions that help create each level, indexed by level
var level_create_fns = [];

// Common objects accessed by many parts of the code
var ball;

// Matter.Runner object that tracks framerate
var fps_runner;

// To get mouse events to work must explicitly create mouse constraint now
var mouseConstraint = MouseConstraint.create(engine);

// Most recent mouse position from mosemove function
var mousePos = {x:0, y:0};

// Current level
var current_level;

// Variable to control the camera, see: matterjs_camera.js
var camera = new matterjs_camera(engine);

// Variable to control the ball spawn zone
var spawn_zone = {x:0, y:0, r:100, max_pull:200, divisor:50};


/***********************************************************************
 *                      Matter.js events
 ***********************************************************************/
// Set up callbacks for event handling
//mouse events must come through a mouseConstraint
Events.on(mouseConstraint, 'mousedown', mousedown);
Events.on(mouseConstraint, 'mousemove', mousemove);
Events.on(mouseConstraint, 'mouseup', mouseup);
Events.on(engine, 'afterUpdate', afterUpdate);
Events.on(engine, 'collisionEnd', afterCollision);
Events.on(engine, 'beforeRender', beforeRender);
Events.on(engine, 'afterRender', afterRender);

function afterUpdate(event)
{
	/*
	if (current_state == STATE_BALL_LAUNCHED)
	{
		setTimeout(function(x, y) {
			if (current_state == STATE_BALL_LAUNCHED && Math.abs(ball.position.x-x) < 1 && Math.abs(ball.position.y-y) < 1)
			{
				current_state = STATE_TARGET_MISSED;
				setTimeout(run_level, DEBUG ? 500 : 4000, current_level, false);
			}}, 1000, ball.position.x, ball.position.y);
	}
	*/
	//render_variables();
}

// Check to see if the ball collided with the target
function afterCollision(event)
{
	
}

function beforeRender(event)
{

}

function afterRender(event)
{
	// Draw spawn_zone
	var x = spawn_zone.x; var y = spawn_zone.y; var r = spawn_zone.r;
	// Transparent background...
	ctx.beginPath();
	ctx.fillStyle = 'rgba(66, 99, 200, 0.45)';
	ctx.arc(x, y, r, 0, 2 * Math.PI);
	ctx.fill();
	// Moving gradient
	var gradient = ctx.createRadialGradient(x,y,r,x,y,0);
	var a = 0.5 + Math.sin(engine.timing.timestamp / 800) / 2.05;
	if (a < 0.005 )
		a = 0.005; // Don't get too close to zero
	gradient.addColorStop(0,"transparent");
	gradient.addColorStop(Math.max(a-0.5, 0),"transparent");
	gradient.addColorStop(a, 'rgb(66, 99, 200)');
	gradient.addColorStop(Math.min(a+0.5, 1),"transparent");
	ctx.fillStyle = gradient;
	ctx.fillRect(x-r, y-r , 2 * r, 2 * r);

	if (DEBUG && current_state == STATE_MOUSEDOWN)
	{
		// Determine the force with which the ball would be launched from here
		var mouseDist = Vector.sub(canvasToWorldPt(mousePos), ball.position);
		var angle = Vector.angle(canvasToWorldPt(mousePos), ball.position); //angle between PI and -PI relative to 0 x-axis
		var netF = Math.min(Vector.magnitude(mouseDist), spawn_zone.max_pull) / spawn_zone.divisor;
		var force = Vector.create(netF*Math.cos(angle), netF*Math.sin(angle));
		// Calculate future positions of the ball
		var futurePositions = calcFuture(ball, force);
		// Draw a line between each position in sequence	
		ctx.strokeStyle = 'yellow';
		var ballpos = worldToCanvasPt(ball.position);
		ctx.beginPath(); ctx.moveTo(ballpos.x, ballpos.y);
		for(i in futurePositions)
		{
			var tmp = worldToCanvasPt(futurePositions[i]);
			ctx.lineTo(tmp.x, tmp.y);
		}
		ctx.stroke();
	}
	
	if (!DEBUG && current_state == STATE_MOUSEDOWN)
	{
		// Draw a simple arrow in the direction the ball would launch
		var mouseDist = Vector.sub(canvasToWorldPt(mousePos), ball.position);
		var angle = Vector.angle(canvasToWorldPt(mousePos), ball.position); //angle between PI and -PI relative to 0 x-axis
		var netF = Math.min(Vector.magnitude(mouseDist), spawn_zone.max_pull);
		var direction = Vector.create(netF*Math.cos(angle), netF*Math.sin(angle));
		var ballpos = worldToCanvasPt(ball.position);
		var arrowtip = worldToCanvasPt(Vector.add(ball.position, direction));
		draw_arrow(ballpos.x, ballpos.y, arrowtip.x, arrowtip.y);
	}
	
	if (DEBUG && current_state >= STATE_AFTER_INIT)
	{
		// Draw FPS
		draw_textbox('FPS:' + round(fps_runner.fps, 1), 20, 20, { centered: false });
		// Draw Coordinates
		var wpt = canvasToWorldPt(mousePos);
		//draw_textbox(round(wpt.x,4) + ', ' + round(wpt.y,4), mousePos.x, mousePos.y + 30, { centered: false });
	}
}



function mousedown(event)
{
	if (current_state != STATE_MOUSEUP)
		return;
	var dx = event.mouse.position.x - spawn_zone.x;
	var dy = event.mouse.position.y - spawn_zone.y;
	if (Math.sqrt(dx*dx + dy*dy) > spawn_zone.r)
		return;
	console.log("mousedown");
	mousePos = canvasToWorldPt(event.mouse.position);
	arrowTo = {x:0, y:0};
	ball = Bodies.circle(mousePos.x, mousePos.y, 10, {
		name:"ball",
		timeScale: 0,
		mass: 30,
		restitution: 0.5,
		render:{fillStyle: '#BBBBBB',
				strokeStyle: '#222222'}
	});
	Body.updateInertia(ball);
	World.add(engine.world, ball);
	current_state = STATE_MOUSEDOWN;
}

// 
function mousemove(event)
{
	mousePos = event.mouse.position;
	if (current_state != STATE_MOUSEDOWN)
		return;
	
}

function mouseup(event)
{
	if (current_state != STATE_MOUSEDOWN)
		return;
	var mouseDist = Vector.sub(canvasToWorldPt(event.mouse.position), ball.position);
	
	var angle = Vector.angle(canvasToWorldPt(event.mouse.position), ball.position); //angle between PI and -PI relative to 0 x-axis
	var netF = Math.min(Vector.magnitude(mouseDist), spawn_zone.max_pull) / spawn_zone.divisor;
	var force = Vector.create(netF*Math.cos(angle), netF*Math.sin(angle));
	
	console.log(force);
	ball.timeScale = 1;
	Body.applyForce(ball, ball.position, force);
	current_state = STATE_MOUSEUP;
}

/***********************************************************************
 *                      Level Creation
 ***********************************************************************/
function create_obstacle(worldObjects, x, y, w, h)
{
	worldObjects.push(Bodies.rectangle(x, y, w, h, {name:"obstacle", isStatic: true, render:{fillStyle: 'gray'}}));
}
 
function create_green(worldObjects, x, y, w, h)
{
	worldObjects.push(Bodies.rectangle(x, y, w, h, {name:"green", render:{fillStyle: 'green'}}));
}

function create_red(worldObjects, x, y, w, h)
{
	worldObjects.push(Bodies.rectangle(x, y, w, h, {name:"red", render:{fillStyle: 'red'}}));	
}

level_create_fns.push( function(worldObjects) {	 // level 0
	create_obstacle(worldObjects, 800, 300, 100, 10);
	spawn_zone.x = 300;
	spawn_zone.y = 300;
});

level_create_fns.push( function(worldObjects) {	 // level 1

});

/***********************************************************************
 *                      Onclick Buttons
 ***********************************************************************/
function set_iron()
{

}

function set_steel()
{

}

function set_rubber()
{
}


function set_gp1()
{
}

function set_gp2()
{
}

function set_gp3()
{
}
 
 /***********************************************************************
 *                      Misc. Functions
 ***********************************************************************/
 function calcFuture(body, force)
 {
	// Copy body variables so we don't overwrite them
	var x = body.position.x; var y = body.position.y;
	var vx = x - body.positionPrev.x; var vy = y - body.positionPrev.y;

	// Precalculate stuff that won't change
	var bodyMass = body.area * body.density;
	var frictionAir = 1 - body.frictionAir * engine.timing.timeScale;
	var deltaTimeSquared = Math.pow(fps_runner.delta * engine.timing.timeScale, 2);
	var gravityX = bodyMass * engine.world.gravity.x * 0.001;
	var gravityY = bodyMass * engine.world.gravity.y * 0.001;

	// Calculate and store 180 physics timesteps into the future
	var futurePositions = [];
	for(i = 1; i < 180; i++)
	{
		// update velocity with Verlet integration
		vx = (vx * frictionAir) + (force.x / bodyMass) * deltaTimeSquared;
		vy = (vy * frictionAir) + (force.y / bodyMass) * deltaTimeSquared;
		x += vx;
		y += vy;
		
		futurePositions.push({x:x, y:y});
		force = {x:gravityX, y:gravityY};
	}
	return futurePositions;
}

function run_level(n, use_visualization)
{
	use_visualization = typeof use_visualization == 'undefined' ? true : use_visualization;
	if (n < 0 || n >= level_create_fns.length)
	{	// This level is not defined
		n = 0;
	}
	
	// Stop existing simulation
	if (typeof fps_runner != 'undefined')
		Matter.Runner.stop(fps_runner);

	// Clear previous bodies from world
	World.clear(engine.world);
	
	// Reset array visualization
	if (use_visualization)
		arrayVis_reset();
	
	current_state = STATE_PRE_INIT;
	
	engine.render.options.background = 'images/nebula' + n + '.jpg'
	
	var worldObjects = [];
	level_create_fns[n](worldObjects);
	fps_runner = Engine.run(engine);

	current_level = n;	// Set global level variable
	current_state = STATE_AFTER_INIT;
	
	// Freeze simulation while adding objects
	engine.timing.timeScale = 0;
	
	show_next_body.bodies = [];
	show_next_body.next = 0;
	for (var k in worldObjects)
	{
		var obj = worldObjects[k];
		if (obj.type == "composite")
		{
			// Get a list of all bodies in this composite
			var allComposite = Composite.allBodies(obj);
			// Make them all invisible
			for(var i = 0; i < allComposite.length; i++)
			{
				show_next_body.bodies.push(allComposite[i])
				allComposite[i].render.visible = (!use_visualization);
			}
		}
		else
		{
			show_next_body.bodies.push(obj);
			obj.render.visible = (!use_visualization);
		}
		
		// Add it to the world
		World.add(engine.world, obj);
	}
	
	if (use_visualization)
		show_next_body("finished");
	else
	{	// Pick the ball and powder for the user
		current_state = STATE_NONE_CHOSEN;
		engine.timing.timeScale = 1;
		ball_choice_fn(); powder_choice_fn();
	}
}

function show_next_body(reason)
{
	if (reason != "finished")
	{
		console.warn("show_next_body: arrayVis did not complete successfully (" + reason + ")");
		return;
	}
	if (show_next_body.next > 0)
	{
		var prev_obj = show_next_body.bodies[show_next_body.next - 1];
		prev_obj.render.visible = true;
	}
	
	if (show_next_body.next == show_next_body.bodies.length)
	{
		current_state = STATE_MOUSEUP;
		engine.timing.timeScale = 1;
		return;
	}
	
	var next_obj = show_next_body.bodies[show_next_body.next];
	arrayVis_insert(next_obj.name, show_next_body);
	
	show_next_body.next += 1;
}

// Draws a text box centered at (xCenter, yCenter)
function draw_textbox(text, xCenter, yCenter, options)
{
	var defaults = {
		x_margin: 5,
		y_margin: 5,
		background: 'white',
		outline: 'black',
		fillStyle: 'black',
		font: '16px Arial',
		centered: true
	}
	var tb = Matter.Common.extend(defaults, options);

	var ctxBackup;
	saveProperties(ctx, ctxBackup);	//saveProperties defined in visualize.js
	
	ctx.font = tb.font;
	var h = pixiGetFontHeight(ctx.font) + 2 * tb.y_margin;	// pixiGetFontHeight defined in visualize.js
	var w = ctx.measureText(text).width + 2 * tb.x_margin;
	var x, y;
	if (tb.centered == true)
		x = xCenter - w/2, y = yCenter - h/2;
	else
		x = xCenter, y = yCenter;
	
	ctx.fillStyle = tb.background; ctx.strokeStyle = tb.outline;
	ctx.fillRect(x, y, w, h);
	ctx.strokeRect(x, y, w, h);
	
	ctx.textAlign = 'left'; ctx.textBaseline = 'top';
	ctx.fillStyle = tb.fillStyle; 
	ctx.fillText(text, x + tb.x_margin, y + tb.y_margin);
	
	restoreProperties(ctx, ctxBackup);
}

/***********************************************************************
 *                      Helper functions
 ***********************************************************************/
// Only prints messages when debugging
function debug(message)
{
	if (DEBUG)
		console.log(message);
}


// Functions for converting between coordinate systems
function canvasToWorldPt(pt)
{
	var min = engine.render.bounds.min;
	var max = engine.render.bounds.max;
	var xworld = min.x + (max.x - min.x) * pt.x / canvas.width;
	var yworld = min.y + (max.y - min.y) * pt.y / canvas.height;
	return {x:xworld, y:yworld};
}

function canvasToWorldCoords(x, y)
{
	return canvasToWorldPt({x:x, y:y});
}

function worldToCanvasPt(pt)
{
	var min = engine.render.bounds.min;
	var max = engine.render.bounds.max;
	var xcanvas = canvas.width * (pt.x - min.x) / (max.x - min.x);
	var ycanvas = canvas.height * (pt.y - min.y) / (max.y - min.y);
	return {x:xcanvas, y:ycanvas};
}

function worldToCanvasCoords(x, y)
{
	return worldToCanvasPt({x:x, y:y});
}

function round(num, decimals)
{
	return Math.round(num * Math.pow(10,decimals)) / Math.pow(10,decimals);
}

// Parameters are in canvas coordiantes
function draw_arrow(x1, y1, x2, y2)
{
	ctx.fillStyle = ctx.strokeStyle = 'yellow';
	ctx.beginPath(); ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2); // Main line
	var arrowtip = Vector.create(x2, y2);
	var direction = Vector.mult(Vector.normalise(Vector.create(x2-x1, y2-y1)), 15);
	var rightedge = Vector.add(arrowtip, Vector.rotate(direction, 0.8*Math.PI));
	var leftedge = Vector.add(arrowtip, Vector.rotate(direction, -0.8*Math.PI));
	ctx.lineTo(rightedge.x, rightedge.y);
	ctx.lineTo(leftedge.x, leftedge.y);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.fill();
}

// Start the first level
run_level(START_LEVEL);