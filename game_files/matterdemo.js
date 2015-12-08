/***********************************************************************
 *                      Global definitions
 ***********************************************************************/
var DEBUG = false;

var canvas = document.getElementById("physicsCanvas");
var ctx = canvas.getContext("2d");

var Engine = Matter.Engine,								//manages updating and rendering canvas
		World = Matter.World,							//composite of entire canvas
		Bodies = Matter.Bodies,							//used to create shapes within canvas
		Body = Matter.Body,								//used to manipulated created bodies in canvas
		Events = Matter.Events,							//used for mouse events like mousdown, mousemove, and mouseup
		Composite = Matter.Composite,					//to clear constraints from the ball before fired and modify composites (remove doesn't work?!)
		Composites = Matter.Composites,					//used to build composites (combining lots of shapes into structures like walls etc)
		Constraint = Matter.Constraint,					//used to create launcher for the ball 
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
			showSleeping: false		// Do not do special rendering for sleeping bodies
		}
}});

// This is a hack to prevent physics from stopping at the edges of the canvas
// source: https://github.com/liabru/matter-js/issues/67
engine.world.bounds.min.x = engine.world.bounds.min.y = -Infinity;
engine.world.bounds.max.x = engine.world.bounds.max.y = Infinity;

var STATE_PRE_INIT = 0;
var STATE_AFTER_INIT = 100;
var STATE_NONE_CHOSEN = 200;
var STATE_BALL_CHOSEN = 201
var STATE_POWDER_CHOSEN = 202;
var STATE_BALL_POWDER_CHOSEN = 203;
var STATE_BALL_LAUNCHED = 300;
var STATE_TARGET_MISSED = 375;
var STATE_TARGET_HIT = 400;

// Tracks the current state of the game
var current_state;

// Contains functions that help create each level, indexed by level
var level_create_fns = [];

// Common objects accessed by many parts of the code
var launcher;
var cannon;
var ball;
var target;
var ballConstraint;

// Matter.Runner object that tracks framerate
var fps_runner;

// To get mouse events to work must explicitly create mouse constraint now
var mouseConstraint = MouseConstraint.create(engine);

// Force with which to launch the ball
var gp_force = 0;

// Most recent mouse position from mosemove function
var mousePos = {x:0, y:0};

// Current level
var current_level;

// The last user ball/powder choice
var ball_choice_fn = DEBUG ? set_steel : function(){};
var powder_choice_fn = DEBUG ? set_gp2 : function(){};

/***********************************************************************
 *                      Matter.js events
 ***********************************************************************/
// Set up callbacks for event handling
//mouse events must come through a mouseConstraint
Events.on(mouseConstraint, 'mousedown', mousedown);
Events.on(mouseConstraint, 'mousemove', mousemove);
Events.on(engine, 'afterUpdate', afterUpdate);
Events.on(engine, 'collisionEnd', afterCollision);
Events.on(engine, 'afterRender', afterRender);

function afterUpdate(event)
{
	if (current_state == STATE_BALL_LAUNCHED)
	{
		setTimeout(function(x, y) {
			if (current_state == STATE_BALL_LAUNCHED && Math.abs(ball.position.x-x) < 1 && Math.abs(ball.position.y-y) < 1)
			{
				current_state = STATE_TARGET_MISSED;
				setTimeout(run_level, DEBUG ? 500 : 4000, current_level, false);
			}}, 1000, ball.position.x, ball.position.y);
	}
	render_variables();
}

// Check to see if the ball collided with the target
function afterCollision(event)
{
	if (current_state != STATE_BALL_LAUNCHED)
		return;
	//console.log("after collision");
	for(var k in event.pairs)
	{
		var a = event.pairs[k].bodyA;
		var b = event.pairs[k].bodyB;
		if ((a.name == "ball" && b.name == "target") || (a.name == "target" && b.name == "ball"))
		{
			// Run next level in 5 seconds...
			current_state = STATE_TARGET_HIT;
			setTimeout(run_level, DEBUG ? 500 : 5000, current_level + 1);
		}
	}
}

function afterRender(event)
{
	if (current_state == STATE_BALL_POWDER_CHOSEN)
	{
		// Determine the force with which the ball would be launched from here
		var vect = Vector.sub(mousePos, ball.position);
		var vecLength = Vector.magnitude(vect);
		var unitVect = Vector.div(vect, vecLength);
		var force = Vector.mult(unitVect, gp_force);
		// Calculate future positions of the ball
		var futurePositions = calcFuture(ball, force);
		// Draw a line between each position in sequence	
		ctx.strokeStyle = 'yellow';
		ctx.beginPath(); ctx.moveTo(ball.position.x, ball.position.y);
		for(i in futurePositions)
			ctx.lineTo(futurePositions[i].x, futurePositions[i].y);
		ctx.stroke();
	}
	
	if (current_state == STATE_TARGET_HIT)
	{
		draw_textbox("Level Complete! The next level will begin soon.", canvas.width/2, canvas.height/2, {
			font:'24px Arial',
			background:'#009900',
			outline:'yellow',
			x_margin:30,
			y_margin:20
		});
	}
	
	if (current_state == STATE_TARGET_MISSED)
	{
		draw_textbox("You missed! The level will restart soon.", canvas.width/2, canvas.height/2, {
			font:'24px Arial',
			background:'#009900',
			outline:'yellow',
			x_margin:30,
			y_margin:20
		});
	}
	
	if (DEBUG && current_state >= STATE_NONE_CHOSEN)
		draw_textbox(Math.round(fps_runner.fps * 10) / 10, 20, 20, { centered: false });
		
}

function mousedown(event)
{
	if (current_state < STATE_BALL_POWDER_CHOSEN || current_state >= STATE_BALL_LAUNCHED)
		return;
	// Turn off user's ability to interact (no more firing or changing position of ball)
	//Events.off(mouseConstraint); 
	// Calculate a vector pointing from the ball to the mouse
	var vect = Vector.sub(event.mouse.mousedownPosition, ball.position);
	var vecLength = Vector.magnitude(vect);
	var unitVect = Vector.div(vect, vecLength);
	var force = Vector.mult(unitVect, gp_force);
	// Remove ballConstraint of launcher so the cannonball will move
	Body.setStatic(ball, false);
	Composite.removeConstraint(launcher, ballConstraint); 
	// Apply that vector as a force
	Body.applyForce(ball, ball.position, force);
	current_state = STATE_BALL_LAUNCHED;
}

// Make ball follow mouse defined in mouseConstraint
function mousemove(event)
{
	mousePos = event.mouse.position;
	if (current_state < STATE_NONE_CHOSEN || current_state >= STATE_BALL_LAUNCHED)
		return;
	var radius = ball.circleRadius + cannon.circleRadius;
	var angle = Vector.angle(cannon.position, mousePos); //angle between PI and -PI relative to 0 x-axis
	var newPos = Vector.create(radius*Math.cos(angle), radius*Math.sin(angle));
	newPos = Vector.add(newPos, cannon.position);
	Body.setPosition(ball, newPos);
}

/***********************************************************************
 *                      Level Creation
 ***********************************************************************/
function create_common(worldObjects, xTarget, yTarget, xCannon, yCannon)
{
	var xMedian = canvas.width / 2;
	var yMedian = canvas.height / 2;
	// Create the world borders
	worldObjects.push(Bodies.rectangle(xMedian, canvas.height + 40, canvas.width + 100, 100, {name:"border", isStatic: true, render:{fillStyle: 'green'} })); // bottom
	worldObjects.push(Bodies.rectangle(xMedian, -40, canvas.width + 100, 100, {name:"border", isStatic: true, render:{fillStyle: 'blue'}}));   // top
	worldObjects.push(Bodies.rectangle(-40, yMedian, 100, canvas.height - 20, {name:"border", isStatic: true, render:{fillStyle: 'blue'}}));  // left
	worldObjects.push(Bodies.rectangle(canvas.width + 40, yMedian, 100, canvas.height - 20, {name:"border", isStatic: true, render:{fillStyle: 'blue'}}));  // right

	worldObjects.push(target = Body.create({
		position: { x: xTarget, y: yTarget },
		restitution: 0.5,
		vertices: [{ x:0, y: 0 }, { x:-20, y: 10 }, { x:-20, y: 30 }, { x:20, y: 30 }, { x:20, y: 10 }],
		name:"target"
	}));
	
	var launcherSet = 0x0002; //used to make ball and cannon not collide by putting them in same group
	cannon = Bodies.circle(xCannon, yCannon, 30, { 
		name:"cannon",
		isStatic: true,
		collisionFilter:{category: launcherSet},
		render:{fillStyle: 'white'}
	});
	
	ball = Bodies.circle(xCannon+30+10, yCannon, 10, {
		name:"ball",
		isStatic: true,
		collisionFilter:{category: launcherSet},
		render:{fillStyle: 'white'}
	});
	
	// This composite groups both the cannon and ball into one "body"
	launcher = Composite.create();
	Composite.add(launcher, [ball, cannon]);
	ballConstraint = Constraint.create({
		bodyA: cannon,
		bodyB: ball
	});
	Composite.addConstraint(launcher, ballConstraint); //we make sure the distance of centers between the ball and cannon is constant
	worldObjects.push(launcher);
}

function create_obstacle(worldObjects, x, y, w, h)
{
	worldObjects.push(Bodies.rectangle(x, y, w, h, {name:"obstacle", isStatic: true, render:{fillStyle: 'brown'}}));
}
 
level_create_fns.push( function(worldObjects) {	 // level 0
	create_common(worldObjects, 650, 450, 60, 540);
	create_obstacle(worldObjects, 650, 480, 80, 40);
	// build a destructible wall
	// x pos, y pos, # cols, # rows, x spacing, y spacing
	var stack = Composites.stack(450, 400, 1, 4, 5, 0, function(x, y) {
		return Bodies.rectangle(x, y, 30, 30, { name:"stack", density: 0.02});
	});
	worldObjects.push(stack);
});

level_create_fns.push( function(worldObjects) {	 // level 1
	create_common(worldObjects, 600, 245, 60, 540);
	create_obstacle(worldObjects, 200, 300, 60, 20);
	create_obstacle(worldObjects, 150, 100, 20, 70);
	create_obstacle(worldObjects, 600, 160, 30, 90);
	create_obstacle(worldObjects, 600, 300, 60, 80);
	create_obstacle(worldObjects, 600, 300, 60, 80);
});

level_create_fns.push( function(worldObjects) {	 // level 2
	create_common(worldObjects, 600, 65, 60, 540);
	create_obstacle(worldObjects, 100, 200, 60, 20);
	create_obstacle(worldObjects, 400, 300, 60, 20);
	create_obstacle(worldObjects, 270, 100, 20, 70);
	create_obstacle(worldObjects, 300, 400, 30, 90);
	create_obstacle(worldObjects, 600, 100, 60, 40);
});

level_create_fns.push( function(worldObjects) {	 // level 3
	create_common(worldObjects, 640, 275, 60, 540);
	create_obstacle(worldObjects, 600, 100, 40, 400);
	create_obstacle(worldObjects, 640, 295, 40, 10);
});


/***********************************************************************
 *                      Onclick Buttons
 ***********************************************************************/
function set_iron()
{
	if (current_state < STATE_NONE_CHOSEN || current_state >= STATE_BALL_LAUNCHED)
		return;
	Body.setDensity(ball, 0.09);
	Body.setRestitution(ball, 0.4);
	Body.setFillstyle(ball, '#7E7E7E');
	current_state = current_state | 1;	// Set ball chosen flag
	ball_choice_fn = set_iron;
}

function set_steel()
{
	if (current_state < STATE_NONE_CHOSEN || current_state >= STATE_BALL_LAUNCHED)
		return;
	Body.setDensity(ball, 0.07);
	Body.setRestitution(ball, 0.3);
	Body.setFillstyle(ball, '#C1C1C1');
	current_state = current_state | 1;
	ball_choice_fn = set_steel;
}

function set_rubber()
{
	if (current_state < STATE_NONE_CHOSEN || current_state >= STATE_BALL_LAUNCHED)
		return;
	Body.setDensity(ball, 0.05);
	Body.setRestitution(ball, 0.8);
	Body.setFillstyle(ball, '#EC2128');
	current_state = current_state | 1;
	ball_choice_fn = set_rubber;
}


function set_gp1()
{
	if (current_state < STATE_NONE_CHOSEN || current_state >= STATE_BALL_LAUNCHED)
		return;
	gp_force = 1.25;
	current_state = current_state | 2;	// Set powder chosen flag
	powder_choice_fn = set_gp1;
}

function set_gp2()
{
	if (current_state < STATE_NONE_CHOSEN || current_state >= STATE_BALL_LAUNCHED)
		return;
	gp_force = 1.75;
	current_state = current_state | 2;
	powder_choice_fn = set_gp2;
}

function set_gp3()
{
	if (current_state < STATE_NONE_CHOSEN || current_state >= STATE_BALL_LAUNCHED)
		return;
	gp_force = 2.15;
	current_state = current_state | 2;
	powder_choice_fn = set_gp3;
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
	var frictionAir = 1 - body.frictionAir * engine.timing.timeScale * body.timeScale;
	var deltaTimeSquared = Math.pow(fps_runner.delta * engine.timing.timeScale * body.timeScale, 2);
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
		current_state = STATE_NONE_CHOSEN;
		engine.timing.timeScale = 1;
		ball_choice_fn(); powder_choice_fn();
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


// Start off at level 0
run_level(0);