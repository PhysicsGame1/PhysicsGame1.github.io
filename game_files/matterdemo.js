/***********************************************************************
 *                      Global definitions
 ***********************************************************************/
var DEBUG = window.location.protocol == 'file:';		// Testing features enabled by default if running from local file system
var START_LEVEL = DEBUG ? 10 : 0;	// This level will be run when the game starts

var STATE_INITIALIZING = 0;

var STATE_MOUSEUP = 200;
var STATE_MOUSEDOWN = 300;
var STATE_POWERUP = 350;

var STATE_TARGET_HIT = 400;

var STATE_START_MENU = 600;
var STATE_PAUSE_MENU = 601;
var STATE_LEVEL_SELECT_MENU = 610;
var STATE_INTRO_SCROLL = 620;

var STATE_REGION_SELECT = 900;

// Sets the default state on loading the game
var START_STATE = DEBUG ? STATE_LEVEL_SELECT_MENU : STATE_START_MENU;

var canvas = document.getElementById("physicsCanvas");
var ctx = canvas.getContext("2d");

// Global variable holding objects for level	
var level_bodies;
// Global variable holding powerups
var powerup_bodies;
// Global variable holding all balls
var ball_bodies;

var Engine = Matter.Engine,								//manages updating and rendering canvas
		World = Matter.World,							//composite of entire canvas
		Bodies = Matter.Bodies,							//used to create shapes within canvas
		Body = Matter.Body,								//used to manipulated created bodies in canvas
		Events = Matter.Events,							//used for mouse events like mousdown, mousemove, and mouseup
		Composite = Matter.Composite,					//to clear constraints from the ball before fired and modify composites (remove doesn't work?!)
		Composites = Matter.Composites,					//used to build composites (combining lots of shapes into structures like walls etc)
		Vector = Matter.Vector,							//for vector algebra
		Constraint = Matter.Constraint,					//for chaining object's together with composites,
		Common = Matter.Common;
	

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
			width:1024,
			height:600
		}
}});


// Tracks the current state of the game
var current_state;
var paused_state;
var tutorial_state = 0;

var powerup_type;

// Contains functions that help create each level, indexed by level
var level_create_fns = [];

// Common objects accessed by many parts of the code
var ball;
var target;

// Matter.Runner object that tracks framerate
var fps_runner = Matter.Runner.create();

// Most recent mouse positions in world and canvas coordinates
var mousePosWorld = {x:0, y:0};
var mousePosCanvas = {x:0, y:0};

// Current level
var current_level = START_LEVEL;

// The currently selected ball type
var ball_type = 'steel_ball';

// Variable to control the camera, see: matterjs_camera.js
var camera = new matterjs_camera(engine);

// Variable holding start position of region selection
var region_select_start;

// Variable to control the ball spawn zone
var spawn_zone = {x:9001, y:9001, r:100, max_pull:200, divisor:50};

// Variable to hold necessary data to generate the background starfield
// Note: Starfield algorithm from http://freespace.virgin.net/hugo.elias/graphics/x_stars.htm
var starfield;

// Variable used to move bodies around when DEBUG==true
var mouseConstraint;

// Contains a reference to the body under the mouse
var body_at_mouse = null;

// Start time of the animation before running the first level
var intro_scroll_time = Date.now();

/*********************
	Analytics Variables
**********************/
var level_name;
var balls_used = 0;
var time_spent_on_level = Date.now();
var time_spent_on_array = 0; 
var time_spent_on_var = 0;
var time_spent_on_cf = 0;
var time_vis_switch = Date.now();

/***********************************************************************
 *                      Buttons
 ***********************************************************************/

var buttons = {};

buttons['Pause'] = new canvas_button(canvas, "Pause", 5, 5, function ()
{
	Matter.Runner.pause(fps_runner);
	paused_state = current_state;
	current_state = STATE_PAUSE_MENU;
}, {hotkey:'KeyP'});

buttons['Debug'] = new canvas_button(canvas, "Debug", 5, 40, function ()
{
	DEBUG = !DEBUG;
	console.log('DEBUG = ' + DEBUG);
}, {hotkey:'KeyD'});

var ball_madness = false;
buttons['Balls'] = new canvas_button(canvas, "Balls", 5, 75, function ()
{
	ball_madness = !ball_madness;
});

buttons['Textures'] = new canvas_button(canvas, "Textures", 5, 110, function ()
{
	var r,i;
	this.options.textures = !this.options.textures;
	if (this.options.textures)
	{
		for(i in level_bodies)
		{
			r = level_bodies[i].render;
			if (r.prev_texture)
			{
				r.sprite.texture = r.prev_texture;
			}
		}
	}
	else
	{
		for(i in level_bodies)
		{
			r = level_bodies[i].render;
			if (r.sprite.texture)
			{
				r.prev_texture = r.sprite.texture;
				r.sprite.texture = '';
			}
		}
	}
}, {textures:true});

buttons['Gravity'] = new canvas_button(canvas, "Gravity", 5, 145, function ()
{
	engine.world.gravity.y = !engine.world.gravity.y;
	for(var i in level_bodies)
		level_bodies[i].frictionAir = engine.world.gravity.y * 0.01;
	templates['iron_ball'].frictionAir = engine.world.gravity.y * 0.01;
	templates['steel_ball'].frictionAir = engine.world.gravity.y * 0.01;
	templates['rubber_ball'].frictionAir = engine.world.gravity.y * 0.01;
});

buttons['Region'] = new canvas_button(canvas, "Region", 5, 180, function()
{
	current_state = STATE_REGION_SELECT;
});

buttons['Start'] = new canvas_button(canvas, "Start", canvas.width / 2, canvas.height / 2 + 50, function ()
{
	//run_level(START_LEVEL);
	current_state = STATE_INTRO_SCROLL;
	intro_scroll_time = Date.now();
}, {centered:true, font:'bold 28px monospace', hotkey:'KeyS'});

buttons['Restart'] = new canvas_button(canvas, 'Restart', canvas.width / 2, canvas.height / 2 - 50, function ()
{
	run_level(current_level);
}, {centered:true, font:'bold 24px monospace', hotkey:'KeyR'});

buttons['Level Select'] = new canvas_button(canvas, 'Level Select', canvas.width / 2, canvas.height / 2, function ()
{
	current_state = STATE_LEVEL_SELECT_MENU;
}, {centered:true, font:'bold 24px monospace', hotkey:'KeyL'});

buttons['Quit'] = new canvas_button(canvas, 'Quit', canvas.width / 2, canvas.height / 2 + 50, function ()
{
	reset_engine();
	current_state = STATE_START_MENU;
}, {centered:true, font:'bold 24px monospace', hotkey:'KeyQ'});

buttons['Cancel'] = new canvas_button(canvas, 'Cancel', canvas.width / 2, canvas.height / 2 + 100, function ()
{
  Matter.Runner.unpause(fps_runner);
	current_state = paused_state;
}, {centered:true, font:'bold 24px monospace', hotkey:'KeyC'});

buttons['Main Menu'] = new canvas_button(canvas, "Main Menu", 5, 5, function ()
{
	current_state = STATE_PAUSE_MENU;
});


/*
	Level select buttons
*/

function generate_level_buttons()
{
	for(var i = 0; i < level_create_fns.length; i++)
	{
		buttons['Level ' + i] = new canvas_button(canvas, 'Level ' + i, 0, 0, function ()
		{
			run_level(this.options.level);
		}, {centered:true, font:'bold 24px monospace', enabled:false, level:i, unlocked:false});
	}
	buttons['Level 0'].options.unlocked = true;
}

function move_level_buttons()
{
	var num_levels = level_create_fns.length;
	var num_columns = 2;
	var num_rows = Math.ceil(num_levels / num_columns);
	
	var x_space = canvas.width / (num_columns+1);
	var y_space = 50;
	var x = 1, y = 1;
	for(var i = 0; i < level_create_fns.length; i++)
	{
		buttons['Level ' + i].move(x * x_space, 100 + y * y_space);
		y += 1;
		if (y > num_rows)
		{
			x += 1;
			y = 1;
		}
	}
}

//buttons['Set Iron'] = new canvas_button(canvas, 'Set Iron', canvas.width / 2, 30, set_iron, {centered:true, image:'images/iron_ball.png'});

/***********************************************************************
 *                      Body Templates
 ***********************************************************************/
var templates = {};

// Contains the variables needed to fool Body.redraw into actually drawing something
templates['fake_body'] = {
	angle:0,
	render:{
		globalAlpha:1,
		visible:true,
		sprite:{
			xScale:1,
			yScale:1,
			xOffset:0.5,
			yOffset:0.5,
			texture:'images/ball.png'
	}}};
templates['fake_body'].parts = [templates['fake_body']];

// Base template for all balls
templates['ball'] = {
	name:"ball",
	timeScale: 0,
	frictionAir: 0.01,
	collisionFilter:{
		mask:0
	},
	render:{
		sprite:{
			xScale:0.5,
			yScale:0.5
}}};

// All other balls are just extensions of templates['ball']
templates['steel_ball'] = Common.extend(Common.clone(templates['ball'], true), {
	density: 0.07,
	restitution: 0.3,
	render: { sprite: { texture: 'images/radioactive_ball.png' }}
});

templates['iron_ball'] = Common.extend(Common.clone(templates['ball'], true), {
	density: 0.09,
	restitution: 0.4,
	render: { sprite: { texture: 'images/energy_ball.png' }}
});

templates['rubber_ball'] = Common.extend(Common.clone(templates['ball'], true), {
	density: 0.05,
	restitution: 0.9,
	render: { sprite: { texture: 'images/electrical_ball.png' }}
});

templates['powerup'] = {
	used: false,
	isStatic: true,
	collisionFilter:{
		mask:0
	},
	render:{
		sprite:{
			xScale:0.4,
			yScale:0.4
}}};

templates['powerup_force'] = Common.extend(Common.clone(templates['powerup'], true), {
	name:'powerup_force',
	render: { sprite: { texture: 'images/accelerator_gate.png' }}
});

templates['powerup_teleport_orange'] = Common.extend(Common.clone(templates['powerup'], true), {
	name:'powerup_teleport_orange',
	render: { sprite: { texture: 'images/powerup_teleport_orange.png' }}
});

templates['powerup_teleport_blue'] = Common.extend(Common.clone(templates['powerup'], true), {
	name:'powerup_teleport_blue',
	render: { sprite: { texture: 'images/powerup_teleport_blue.png' }}
});

templates['border'] = {
	name:"border",
	isStatic: true,
	render:{
		fillColor:'#FFFFFF',
		globalAlpha:0.1
}};

templates['stack'] = {
	name: 'stack',
	mass: 15,
	render:{
		sprite:{
			texture:'images/Astroid.png'
}}};

templates['space_rock'] = {
	name: 'shield',
	mass: 25,
	render:{
		sprite:{
			texture:'images/space_rock.png'
}}};

templates['horiz_space_platform'] = {
	name: 'horiz_space_platform',
	isStatic: true,
	render:{
		sprite:{
			texture:'images/horiz_space_platform3.png'
}}};

templates['horiz_space_platform22'] = {
	name: 'balance',
	mass: 130,
	render:{
		sprite:{
			texture:'images/horiz_space_platform3.png'
}}};

templates['horiz_space_platform23'] = {
	name: 'vertSpin2',
	isStatic: true,
	render:{
		sprite:{
			texture:'images/horiz_space_platform3.png'
}}};

templates['horiz_space_platform1'] = {
	name: 'vertSpin',
	isStatic: true,
	render:{
		sprite:{
			texture:'images/horiz_space_platform3.png'
}}};

templates['vert_space_platform5'] = {
	name: 'vert_space_platform5',
	isStatic: true,
	render:{
		sprite:{
			texture:'images/vert_space_platform5.png'
}}};

templates['space_triangle'] = {
	name: 'pivot',
	isStatic: true,
	render:{
		sprite:{
			xScale:2,
			yScale:2,
			texture:'images/space_triangle.png'
}}};

templates['tutorial_arrow'] = {
	render: { 
		sprite: { 
			texture: 'images/tutorial_arrow.png',
			xScale:0.5,
			yScale:0.5
}}};
	
function circle_body_from_template(name, pos, radius)
{
	var b = Bodies.circle(pos.x, pos.y, radius, templates[name]);
	World.add(engine.world, b);
	level_bodies.push(b);
	avis.insert({drawfn:draw_body, body:b});
	return b;
}

// Warning: Only use with templates that define textures
function draw_body_from_template(name, pos, alpha)
{
	templates['fake_body'].render.globalAlpha = alpha || 1;
	templates['fake_body'].position = pos;
	Common.extend(templates['fake_body'].render.sprite, templates[name].render.sprite);
	Matter.Body.redraw(engine, templates['fake_body']);
}



/***********************************************************************
 *                      Matter.js events
 ***********************************************************************/
// Set up callbacks for event handling
Events.on(fps_runner, 'beforeUpdate', beforeUpdate);
Events.on(fps_runner, 'afterUpdate', afterUpdate);
Events.on(engine, 'collisionEnd', afterCollision);
Events.on(fps_runner, 'beforeRender', beforeRender);
Events.on(fps_runner, 'afterRender', afterRender);
document.addEventListener('keyup', keyup);
document.addEventListener('keydown', keydown);
canvas.addEventListener("mousewheel", mousewheel, false);

$(window).resize(windowresize);
$(window).ready(windowresize);


// All mosue events now go through the same function
document.addEventListener("mousemove", mouseevent, false);
document.addEventListener("mousedown", mouseevent, false);
document.addEventListener("mouseup", mouseevent, false);

function mouseevent(event)
{
	// Translate from window client coordinates to coordinates relative to each canvas
	var mx = event.clientX;
	var my = event.clientY;
	var vis_bounds = v_canvas.getBoundingClientRect();
	var game_bounds = canvas.getBoundingClientRect();

	var vis_relative = {x:mx-vis_bounds.left, y:my-vis_bounds.top};
	mousePosCanvas = {x:mx-game_bounds.left, y:my-game_bounds.top}; // matterdemo global
	mousePosWorld = canvasToWorldPt(mousePosCanvas);
  
  
	if (event.type == 'mousedown')
	{
		// Only dispatch mousedown events if they occur in one of the canvases
		// Check if the event occurred in the visualization canvas
		mouseevent.lastClick = '';
		if (mx >= vis_bounds.left && mx <= vis_bounds.right && my >= vis_bounds.top && my <= vis_bounds.bottom)
		{
			event.preventDefault(); // Prevent highlighting stuff when dragging the mouse
			v_mousedown(vis_relative);
			mouseevent.lastClick = 'visualization';
		}
		else if (mx >= game_bounds.left && mx <= game_bounds.right && my >= game_bounds.top && my <= game_bounds.bottom)
		{
			event.preventDefault();
			if (DEBUG && mouseConstraint && is_playing())
			{
				var body = Matter.Engine.bodyAtPt(engine, mousePosWorld);
				if (body && Matter.Detector.canCollide(body.collisionFilter, mouseConstraint.collisionFilter))
				{
					mouseConstraint.constraint.bodyB = body;
					mouseConstraint.constraint.pointB = Vector.sub(mousePosWorld, body.position);
					mouseConstraint.constraint.angleB = body.angle;
					return;
				}
			}
		  
		  mousedown(mousePosCanvas);
		  mouseevent.lastClick = 'game';
		}

	}
	else if (event.type == 'mousemove')
	{
		v_mousemove(vis_relative);
		if (mouseConstraint)
			mouseConstraint.constraint.pointA = mousePosWorld;
	}
	else if (event.type == 'mouseup')
	{
		// Only want to fire mouseup if mousedown was previously invoked to the same canvas
		if (mouseevent.lastClick == 'visualization')
			v_mouseup(vis_relative);
		else if (mouseevent.lastClick == 'game')
			mouseup(mousePosCanvas);
		mouseevent.lastClick = '';
		if (mouseConstraint)
			mouseConstraint.constraint.bodyB = mouseConstraint.constraint.pointB = null;
	}
	//console.log(event.type);
}

function beforeUpdate(event)
{	
	tick_starfield();
	
	if(is_playing())
		checkPowerupHit(); //must be called after game is set up
		
	if(current_level == 7)
		checkLevelSeven();
}


//if this function is called it should always be the case that we can find a powerup
//just in case make sure though. . .
function checkPowerupHit()
{
	for(var i in powerup_bodies)
	{
		var powerup = powerup_bodies[i];
		for(var k in ball_bodies)
		{
			if (powerup.used)	
				break; // In case a linked teleport is used before reaching it in the loop
				
			var ballk = ball_bodies[k];
			var vec = Vector.sub(ballk.position, powerup.position);
			if (Vector.magnitude(vec) < (powerup.circleRadius + ballk.circleRadius))
			{	// A ball touched a powerup
				if (powerup.name=="powerup_force")
				{
					var netF = 1.5; //adjust this to determine mangitude of force
					var force = Vector.create(netF*Math.sin(powerup.angle), -netF*Math.cos(powerup.angle));
					Body.applyForce(ballk, ballk.position, force);
				}
				else if (powerup.name=="powerup_teleport_blue" || powerup.name=="powerup_teleport_orange")
				{
					if (!powerup.link)
						continue;  // This teleport has not yet been linked
					Body.setPosition(ballk, powerup.link.position);
					// Remove the linked teleport
					powerup.link.used = true;
					Composite.remove(engine.world, powerup.link);
				}
				powerup.used = true; // Mark for later deletion (cannot delete in a for loop)
				Composite.remove(engine.world, powerup);
			}
		}
	}
	// Remove powerups that were used from all arrays
	avis.filter(function(e) { return !(e.body.used); });
	powerup_bodies = powerup_bodies.filter(function(e) { return !(e.used); });
	level_bodies = level_bodies.filter(function(e) { return !(e.used); });
}

function checkLevelSeven()
{
	for(var i = 0; i < level_bodies.length; ++i)
	{
		var py, k = level_bodies[i];
		//var vx = 10 * Math.cos(k.angle + Math.PI);
		//var vy = 10 * Math.sin(k.angle + Math.PI);
		if(k.name == "vertSpin")
		{
			//alert("Inside vertSpin. Decision One TRUE. name = " + k.name);
			py = 100 * Math.sin(engine.timing.timestamp * 0.002);
			//var px = 100 * Math.cos(engine.timing.timestamp * 0.002);
			//Body.setVelocity(k, { x: 0, y: 50 - py});
			Body.setAngularVelocity(k, 0.02);
			Body.setPosition(k, { x: k.position.x, y: 450 -  py});
			Body.rotate(k, 0.03);
				
		}
		else if(k.name == "vertSpin2")
		{
			//alert("Inside vertSpin2. Decision Two TRUE. name = " + k.name);
			py = 150 * Math.sin(engine.timing.timestamp * 0.004);
			//var px = 150 * Math.sin(engine.timing.timestamp * 0.004);
			//Body.setVelocity(k, { x: vx, y: vy});
			Body.setAngularVelocity(k, -0.01);
			Body.setPosition(k, { x: k.position.x, y: 550 - py});
			Body.rotate(k, -0.02);
		}
		/*
		else if(k.name == "shield")
		{
			if(Math.random() < .5) {
				var force = 0;
				force.x = 1-Math.random();
				force.y = 1-Math.random();
				Body.applyForce(k, k.position, force);
			}
		}
		*/
	}
}

function afterUpdate(event)
{
	body_at_mouse = Engine.bodyAtPt(engine, mousePosWorld);
	if (is_ready_to_fire() && ball_madness && fps_runner.frameCounter % 6 == 0)
	{
		var sc = current_state;
		ball_bodies.push(ball = circle_body_from_template(ball_type, spawn_zone, 10));
		current_state = STATE_MOUSEDOWN;
		mouseup(mousePosCanvas);
		current_state = sc;
	}
}

// Check to see if the ball collided with the target
function afterCollision(event)
{
	if (!is_playing())
		return;
	//console.log("after collision");

	for(var k in event.pairs)
	{
		var a = event.pairs[k].bodyA;
		var b = event.pairs[k].bodyB;
		if ((a.name == "ball" && b.name == "target") || (a.name == "target" && b.name == "ball"))
		{
			//console.log("Target hit detected..." + current_state + ',' + current_level);
			//console.log(engine.world.bodies);
			// Run next level in 5 seconds...
			current_state = STATE_TARGET_HIT;
			fvis.highlight('END');
			var _starfield_speedup = function() {
				if (current_state == STATE_TARGET_HIT)
				{
					camera.moveZoom(DEBUG ? -80 : -8);
					starfield.vmultiplier += DEBUG ? 0.2 : 0.02;
					setTimeout(_starfield_speedup, 15);
				}
			};
			updateVisTime(current_tab);
			level_name = current_level;
			send_analytics();
			_starfield_speedup();
			setTimeout(function() { run_level(current_level + 1); }, DEBUG ? 500 : 5000);
			break;
		}
	}
}

function beforeRender(event)
{
	buttons['Pause'].options.enabled = is_pausible();
	buttons['Pause'].options.visible = current_state != STATE_LEVEL_SELECT_MENU;
	buttons['Balls'].options.visible = is_ready_to_fire() && DEBUG;
	buttons['Start'].options.visible = current_state == STATE_START_MENU;
	buttons['Restart'].options.visible = current_state == STATE_PAUSE_MENU;
	buttons['Level Select'].options.visible = current_state == STATE_PAUSE_MENU;
	buttons['Quit'].options.visible = current_state == STATE_PAUSE_MENU;
	buttons['Cancel'].options.visible = current_state == STATE_PAUSE_MENU;
	buttons['Main Menu'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;
	buttons['Textures'].options.visible = is_ready_to_fire() && DEBUG;
	buttons['Gravity'].options.visible = is_ready_to_fire() && DEBUG;
	buttons['Region'].options.visible = is_ready_to_fire() && DEBUG;
		
	for(var i = 0; i < level_create_fns.length; i++)
	{
		var options = buttons['Level '+i].options;
		options.visible = current_state == STATE_LEVEL_SELECT_MENU;
		options.enabled = DEBUG || options.unlocked;
	}
	
	draw_starfield();
	
	if (current_state != STATE_START_MENU && camera.z > 0)
	{
		// Draw spawn_zone
		var can_pos = worldToCanvasPt(spawn_zone);
		var x = can_pos.x; var y = can_pos.y;
		var r = worldToCanvasCoords(spawn_zone.x + spawn_zone.r, 0).x - can_pos.x; // Hack to get correct radius in canvas coordinates
		// Transparent background...
		ctx.beginPath();
		ctx.fillStyle = 'rgba(66, 99, 200, 0.45)';
		//if (r < 0)
		//	r = -r;

		ctx.arc(x, y, r, 0, 2 * Math.PI);
		ctx.fill();
		// Moving gradient
		var gradient = ctx.createRadialGradient(x,y,r,x,y,0);
		var a = Math.max(0.5 + Math.sin(engine.timing.timestamp / 800) / 2.05, 0.005);
		gradient.addColorStop(0,"transparent");
		gradient.addColorStop(Math.max(a-0.5, 0),"transparent");
		gradient.addColorStop(a, 'rgb(66, 99, 200)');
		gradient.addColorStop(Math.min(a+0.5, 1),"transparent");
		ctx.fillStyle = gradient;
		ctx.fillRect(x-r, y-r , 2 * r, 2 * r);
	}
}

function afterRender(event)
{
	var i, t, x, y, cw = canvas.width, ch = canvas.height;
	if (current_state == STATE_MOUSEDOWN)
	{
		// Determine the force with which the ball would be launched from here
		var angle = Vector.angle(mousePosWorld, ball.position); //angle between PI and -PI relative to 0 x-axis
		var netF = Math.min(distance_from_mouse(ball.position), spawn_zone.max_pull);
		var ballpos;
		
		if (DEBUG)
		{ // Draw a trajectory
			netF /= spawn_zone.divisor;
			var force = Vector.create(netF*Math.cos(angle), netF*Math.sin(angle));
			// Calculate future positions of the ball
			var futurePositions = calcFuture(ball, force);
			// Draw a line between each position in sequence	
			ctx.strokeStyle = 'yellow';
			ballpos = worldToCanvasPt(ball.position);
			ctx.beginPath(); ctx.moveTo(ballpos.x, ballpos.y);
			for(i in futurePositions)
			{
				var tmp = worldToCanvasPt(futurePositions[i]);
				ctx.lineTo(tmp.x, tmp.y);
			}
			ctx.stroke();
		}
		else
		{  // Draw a simple arrow
			var direction = Vector.create(netF*Math.cos(angle), netF*Math.sin(angle));
			ballpos = worldToCanvasPt(ball.position);
			var arrowtip = worldToCanvasPt(Vector.add(ball.position, direction));
			draw_arrow(ballpos.x, ballpos.y, arrowtip.x, arrowtip.y);	
		}
	}
	
	if (current_state == STATE_REGION_SELECT && region_select_start)
	{	// Draw transparent box
		ctx.fillStyle = 'rgba(66, 200, 70, 0.45)';
		ctx.fillRect(Math.min(region_select_start.x, mousePosCanvas.x), Math.min(region_select_start.y, mousePosCanvas.y)
				, Math.abs(region_select_start.x - mousePosCanvas.x), Math.abs(region_select_start.y - mousePosCanvas.y));
	}
	
	if (is_playing() && body_at_mouse != null)
	{
		ctx.fillStyle = 'rgba(66, 200, 70, 0.45)';
		var v = worldToCanvasPt(body_at_mouse.vertices[0]);
		ctx.beginPath();
		ctx.moveTo(v.x, v.y);
		var bounds = {left:v.x, right:v.x, top:v.y, bottom:v.y};
		for (i = 1; i < body_at_mouse.vertices.length; i++)
		{
			v = worldToCanvasPt(body_at_mouse.vertices[i]);
			bounds.left = Math.min(bounds.left, v.x);
			bounds.right = Math.max(bounds.right, v.x);
			bounds.top = Math.min(bounds.top, v.y);
			bounds.bottom = Math.max(bounds.bottom, v.y);
			ctx.lineTo(v.x, v.y);
		}
		body_at_mouse.boundaries = bounds;
		ctx.closePath();
		ctx.fill();
	}
	
	if (DEBUG && (is_playing() || current_state == STATE_REGION_SELECT))
	{
		draw_textbox('   FPS:' + round(fps_runner.fps, 2) +
				'\n World:' + round(mousePosWorld.x,2) + ',' + round(mousePosWorld.y,2) +
				'\nCanvas:' + round(mousePosCanvas.x,2) + ',' + round(mousePosCanvas.y,2) +
				'\n Level:' + current_level
				, canvas.width - 210, 10  // x, y
				, { font:'16px monospace', 
						centered: false,
						backColor: 'rgba(126,126,126,0.6)',
						outlineColor: 'rgba(126,126,126,0.5)',
						textFrontColor: 'white',
						width: 200
						});
	}
	
	// Draw shadow ball if necessary
	if (is_ready_to_fire() && distance_from_mouse(spawn_zone) <= spawn_zone.r)
		draw_body_from_template(ball_type, mousePosWorld, 0.65);
	
	if (placing_powerup() && distance_from_mouse(spawn_zone) > spawn_zone.r)
		draw_body_from_template(powerup_type, mousePosWorld, 0.65);
	
	if (is_playing())
	{ // Draw lines between linked teleports
		ctx.lineWidth = 1;
		ctx.strokeStyle = '#bbbbbb';
		ctx.beginPath();
		var orange_pos, blue_pos;
		for(i in powerup_bodies)
		{
			var powerup = powerup_bodies[i];
			if (powerup.name == 'powerup_teleport_blue')
			{
				blue_pos = worldToCanvasPt(powerup.position);
				ctx.moveTo(blue_pos.x, blue_pos.y);
				if (powerup.link)
				{
					orange_pos = worldToCanvasPt(powerup.link.position);
				}
				else if (current_state == STATE_POWERUP && powerup_type == 'powerup_teleport_orange')
				{	// User is currently placing an orange teleport, but it is not in the array so draw the link here
					orange_pos = mousePosCanvas;
				}
				ctx.lineTo(orange_pos.x, orange_pos.y);
			}
		}
		ctx.stroke();
	}
	
	if (is_in_menu())
	{
		if (current_state == STATE_START_MENU)
		{
			tick_starfield();
			t = Matter.Render.getTexture(engine.render, 'images/title.png');
			ctx.drawImage(t, (cw - t.width) / 2, (ch - t.height) / 2 - 40);
		}
		else if (current_state == STATE_INTRO_SCROLL)
		{
			tick_starfield();
			var progress = (Date.now() - intro_scroll_time) / (DEBUG ? 3000 : 35000);
			var w, h;
			if (progress < 0.25)
			{ // Step 1: Title flys backward
				t = Matter.Render.getTexture(engine.render, 'images/title.png');
				w = Math.max(0, t.width - progress * t.width * (4 - progress));
				h = t.height / t.width * w;
				ctx.drawImage(t, (cw - w) / 2, (ch - h) / 2 - 40, w, h);
			}
			else if (progress >= 0.20 && progress <= 0.75)
			{ // Step 2: Text scrolls in
				progress -= 0.25;
				t = Matter.Render.getTexture(engine.render, 'images/intro.png');
				y = ch - progress * ch * (2 - 2 * progress);
				w =  t.width - progress * t.width * (3 - 2 * progress);
				ctx.drawImage(t, (cw - w) / 2, y, w, w * t.height / t.width);
			}
			else if (progress > 0.75 && progress < 1)
			{ // Step 3: Camera pans down to start level?
				// Shifting the y values of the stars tends to group them at the top of the screen...
				run_level(START_LEVEL);
			}
			else // progress >= 1
				run_level(START_LEVEL);
		}
		else
		{ // Transparent background
			ctx.fillStyle = 'rgba(200,200,200,0.35)';
			ctx.fillRect(0, 0, cw, ch);
		}
	}

	if(is_playing() && tutorial_state < 10 && current_level == 0){
		if(tutorial_state == 0){
			//select ball
			ctx.font = '20px Monospace';
			ctx.fillStyle = 'white';
                        ctx.fillText('Tutorial Level. This is an introduction the the powerups you can use', (canvas.width - ctx.measureText('Tutorial Level. This is an introduction the the powerups you can use').width) / 2, canvas.height - 500);
			ctx.fillText('To begin each level, Select your ball material', (canvas.width - ctx.measureText('To begin each level, Select your ball material').width) / 3 - 75, canvas.height - 150);
			draw_body_from_template('tutorial_arrow', {x:canvas.width/3, y:canvas.height-30 }, 0.65);
		}
		if(tutorial_state == 1){
			//select tele
			ctx.font = '20px Monospace';
			ctx.fillStyle = 'white';
ctx.fillText('Tutorial Level. This is an introduction the the powerups you can use', (canvas.width - ctx.measureText('Tutorial Level. This is an introduction the the powerups you can use').width) / 2, canvas.height - 500);
			ctx.fillText('Select the Teleportation Portal power-up', 
				(canvas.width - ctx.measureText('Select the Teleportation Portal power-up').width) , canvas.height - 150);
			draw_body_from_template('tutorial_arrow', {x:canvas.width/3*2+75, y:canvas.height-30 }, 0.65);
		}
		if(tutorial_state == 2){
			//place tele entrance
			ctx.font = '20px Monospace';
			ctx.fillStyle = 'white';
ctx.fillText('Tutorial Level. This is an introduction the the powerups you can use', (canvas.width - ctx.measureText('Tutorial Level. This is an introduction the the powerups you can use').width) / 2, canvas.height - 500);
			ctx.fillText('Place the entrance portal here', 
				(canvas.width - ctx.measureText('Place the entrance portal here').width)/4 , canvas.height/2);
			draw_body_from_template('tutorial_arrow', {x:canvas.width/3, y:canvas.height/3*2 }, 0.65);
		}
		if(tutorial_state == 3){
			//place tele exit
			ctx.font = '20px Monospace';
			ctx.fillStyle = 'white';
ctx.fillText('Tutorial Level. This is an introduction the the powerups you can use', (canvas.width - ctx.measureText('Tutorial Level. This is an introduction the the powerups you can use').width) / 2, canvas.height - 500);
			ctx.fillText('Place the exit portal here', 
				(canvas.width - ctx.measureText('Place the exit portal here').width)/4*3 , canvas.height/2-75);
			draw_body_from_template('tutorial_arrow', {x:canvas.width/3*2+50, y:canvas.height/3*2-50 }, 0.65);
		}
		if(tutorial_state == 4){
			//select force power up
			ctx.font = '20px Monospace';
			ctx.fillStyle = 'white';
ctx.fillText('Tutorial Level. This is an introduction the the powerups you can use', (canvas.width - ctx.measureText('Tutorial Level. This is an introduction the the powerups you can use').width) / 2, canvas.height - 500);
			ctx.fillText('Select the Accelerator Gate power-up', 
				(canvas.width - ctx.measureText('Select the Accelerator Gate power-up').width) / 2 + 50, canvas.height - 150);
			draw_body_from_template('tutorial_arrow', {x:canvas.width/2+75, y:canvas.height-30 }, 0.65);
		}
		if(tutorial_state == 5){
			//place force power up
			ctx.font = '20px Monospace';
			ctx.fillStyle = 'white';
ctx.fillText('Tutorial Level. This is an introduction the the powerups you can use', (canvas.width - ctx.measureText('Tutorial Level. This is an introduction the the powerups you can use').width) / 2, canvas.height - 500);
			ctx.fillText('Place the Accelerator Gate here', 
				(canvas.width - ctx.measureText('Place the Accelerator Gate here').width)/4+50 , canvas.height/2-50);
			draw_body_from_template('tutorial_arrow', {x:canvas.width/3+50, y:canvas.height/3*2-50 }, 0.65);
		}
		if(tutorial_state == 6){
			//change force direction
			ctx.font = '20px Monospace';
			ctx.fillStyle = 'white';
ctx.fillText('Tutorial Level. This is an introduction the the powerups you can use', (canvas.width - ctx.measureText('Tutorial Level. This is an introduction the the powerups you can use').width) / 2, canvas.height - 500);
			ctx.fillText('Change the direction of the Accelerator Gate', 
				(canvas.width - ctx.measureText('Change the direction of the Accelerator Gate').width)/4+50 , canvas.height/2-75);
			ctx.fillText('so it is pointing toward the entrance portal', 
				(canvas.width - ctx.measureText('so it is pointing toward the entrance portal').width)/4+50 , canvas.height/2-50);
			draw_body_from_template('tutorial_arrow', {x:canvas.width/3+50, y:canvas.height/3*2-50 }, 0.65);
		}
		if(tutorial_state == 7){
			//fire ball hit target
			ctx.font = '20px Monospace';
			ctx.fillStyle = 'white';
ctx.fillText('Tutorial Level. This is an introduction the the powerups you can use', (canvas.width - ctx.measureText('Tutorial Level. This is an introduction the the powerups you can use').width) / 2, canvas.height - 500);
			ctx.fillText('Fire the ball in the Accelerator Gate to hit the target.', 
				(canvas.width - ctx.measureText('Fire the ball in the Accelerator Gate').width)/2+50 , canvas.height/2-75);
			draw_body_from_template('tutorial_arrow', {x:canvas.width/3+50, y:canvas.height/3*2-50 }, 0.65);

			ctx.fillText('to the hit the target', 
				(canvas.width - ctx.measureText('to the hit the target').width)/2+50 , canvas.height/2-50);
			draw_body_from_template('tutorial_arrow', {x:canvas.width/3*2-10, y:canvas.height/3*2-20 }, 0.65);
		}
	}
	
	for (i in buttons)
		buttons[i].draw();
	
	// Run visualization callback
	v_updateframe();
}

function mousedown(event)
{
	if (is_in_menu())
		return;
	
	if (current_state == STATE_REGION_SELECT)
	{
		region_select_start = {x:mousePosCanvas.x, y:mousePosCanvas.y};
		return;
	}
	
	for(var i = 0; i < powerup_bodies.length; ++i)
	{	
		var powerup = powerup_bodies[i];
		//check for click on powerup
		if(powerup.name == "powerup_force")
		{
			if (distance_from_mouse(powerup.position) <= powerup.circleRadius) //mouse click is inside
			{
				var offset = Math.PI*0.5; //offset for force powerup to 0 degrees right instead of up
				var angle = -offset + Vector.angle(mousePosWorld, powerup.position); //angle between PI and -PI relative to 0 x-axis
				Body.setAngle(powerup, angle);
				console.log(angle);
				if(current_level == 0 && tutorial_state == 6 && angle > -2.5 && angle < -2)	//check if force is in direction of tele
					tutorial_state++;
			}
		}
	}
	
	//check to see if they want to place a powerup
	if(placing_powerup() && distance_from_mouse(spawn_zone) > spawn_zone.r)
	{
		console.log('create: ' + powerup_type);
		powerup_bodies.push(circle_body_from_template(powerup_type, mousePosWorld, 22.4));
		if(powerup_type == 'powerup_force' && current_level == 0 && tutorial_state == 5){
			tutorial_state++;
		}
		if (powerup_type == 'powerup_teleport_blue')
		{	// Place orange next. Stay in powerup state.
			powerup_type = 'powerup_teleport_orange';
			if(current_level == 0 && tutorial_state == 2)
				tutorial_state++;
			return;
		}
		if (powerup_type == 'powerup_teleport_orange')
		{ // Link up the two teleports
			var blue = powerup_bodies[powerup_bodies.length-2];
			var orange = powerup_bodies[powerup_bodies.length-1];
			blue.link = orange;
			orange.link = blue;
			if(current_level == 0 && tutorial_state == 3)
				tutorial_state++;
		}
		current_state = STATE_MOUSEUP;
	}
	
	// Check placing a ball
	if (is_ready_to_fire() && distance_from_mouse(spawn_zone) < spawn_zone.r)
	{
		// Spawn a ball
		ball_bodies.push(ball = circle_body_from_template(ball_type, mousePosWorld, 10));
		balls_used++;
		current_state = STATE_MOUSEDOWN;
		fvis.highlight('GETFORCE');
	}
}

function mouseup(event)
{
	if (current_state == STATE_REGION_SELECT)
	{
		var p = canvasToWorldPt(region_select_start);
		console.log(
			'Top Left:     (' + round(Math.min(p.x, mousePosWorld.x),2) + ', ' + round(Math.min(p.y, mousePosWorld.y),2) + ')'
		+ '\nBottom Right: (' + round(Math.max(p.x, mousePosWorld.x),2) + ', ' + round(Math.max(p.y, mousePosWorld.y),2) + ')'
		+ '\nCenter:       (' + round((p.x + mousePosWorld.x)/2,2) + ', ' + round((p.y+mousePosWorld.y)/2,2) + ')'
		+ '\nxRadius:      ' + round(Math.abs(mousePosWorld.x-p.x) / 2,2)
		+ '\nyRadius:      ' + round(Math.abs(mousePosWorld.y-p.y) / 2,2)
		+ '\nWidth:        ' + round(Math.abs(mousePosWorld.x-p.x),2)
		+ '\nHeight :      ' + round(Math.abs(mousePosWorld.y-p.y),2));
		current_state = STATE_MOUSEUP;
		region_select_start = undefined;
	}
	
	if (current_state == STATE_MOUSEDOWN)
	{
		var angle = Vector.angle(mousePosWorld, ball.position); //angle between PI and -PI relative to 0 x-axis
		var netF = Math.min(distance_from_mouse(ball.position), spawn_zone.max_pull) / spawn_zone.divisor;
		var force = Vector.create(netF*Math.cos(angle), netF*Math.sin(angle));
		ball.timeScale = 1;
		Body.applyForce(ball, ball.position, force);
		Body.enableCollisions(ball);
		current_state = STATE_MOUSEUP;
		fvis.highlight('LAUNCH');
		setTimeout(function() { fvis.highlight('HITCHECK'); }, 1000);
		setTimeout(function() { if (current_state == STATE_MOUSEUP) fvis.highlight('GETPOS'); }, 3000);
		return;
	}
	for (var k in buttons)
	{
		if (buttons[k].mouseup())
			return;
	}
}

function keydown(event)
{
	if (event.code == 'ArrowLeft')
		camera.translateCamera(-10, 0);
	else if (event.code == 'ArrowRight')
		camera.translateCamera(10, 0);
	else if (event.code == 'ArrowUp')
		camera.translateCamera(0, -10);
	else if (event.code == 'ArrowDown')
		camera.translateCamera(0, 10);
}

function keyup(event)
{
	console.log(event.code + ' pressed.');
	for (var k in buttons)
	{
		if (buttons[k].keypress(event.code))
			return;
	}
}

function mousewheel(event)
{
	camera.moveZoom(event.wheelDelta / -2);
}

// Runs when page resizes
function windowresize()
{
	var ow = canvas.width, oh = canvas.height;
	// Fit canvases to screen
	var h1 = window.innerHeight - document.getElementById('top_bar').offsetHeight - document.getElementById('input_fields').offsetHeight - 130;
	var h2 = (window.innerWidth - document.getElementById('vis_selector').offsetWidth - 20) / 1024 * 600;
	canvas.height = Math.min(h1,h2);
	canvas.width = canvas.height * 1024 / 600;
	v_canvas.width = document.getElementById('vis_selector').clientWidth; //v_canvas.height * 500 / 560;
	v_canvas.height = canvas.height - document.getElementById('vis_selector').offsetHeight;
	
	// Reposition canvas buttons
	var x = canvas.width / 2; var y = canvas.height / 2;
	buttons['Start'].move(x, y + 50);
	buttons['Restart'].move(x, y - 50);
	buttons['Level Select'].move(x, y);
	buttons['Quit'].move(x, y + 50);
	buttons['Cancel'].move(x, y + 100);
	move_level_buttons();
		
	// Spread out stars
	resize_starfield(ow, oh, canvas.width, canvas.height);
}

/***********************************************************************
 *                      Level Creation
 ***********************************************************************/
function create_common(worldObjects, xTarget, yTarget, xCannon, yCannon, xmin, xmax, ymin, ymax)
{ // x coordinate of target,  y coordinate of target, x coordinate of cannon,  y coordinate of cannon,
	if (typeof xmin === 'undefined') xmin = 0;
	if (typeof ymin === 'undefined') ymin = 0;
	if (typeof xmax === 'undefined') xmax = 1024;
	if (typeof ymax === 'undefined') ymax = 600;
	
	camera.fitToBounds(xmin, xmax, ymin, ymax);
	
	var xLength = xmax - xmin;
	var yLength = ymax - ymin;
	var xMedian = (xmax + xmin) / 2;
	var yMedian = (ymax + ymin) / 2;

	// Create the world borders
	worldObjects.push(Bodies.rectangle(xMedian, ymax + 50, xLength + 200, 100, templates['border']));	// bottom
	worldObjects.push(Bodies.rectangle(xMedian, ymin - 50, xLength + 200, 100, templates['border']));	// top
	worldObjects.push(Bodies.rectangle(xmin - 50, yMedian, 100, yLength, templates['border']));	// left
	worldObjects.push(Bodies.rectangle(xmax + 50, yMedian, 100, yLength, templates['border']));	// right
	var texture = "images/EnemyShip.png";
	worldObjects.push(target = Bodies.rectangle(xTarget, yTarget, 45, 30, {mass: 6, name:"target", render: {sprite:{ texture: texture, xScale:1, yScale:1}}}));

	spawn_zone.x = xCannon;
	spawn_zone.y = yCannon;
	
	mouseConstraint = Matter.MouseConstraint.create(engine, {constraint:{pointB:null}});
	World.add(engine.world, mouseConstraint);
}
function create_obstacle(worldObjects, x, y, w, h, template)
{
	if(template === undefined)
		worldObjects.push(Bodies.rectangle(x, y, w, h, {name:'obstacle', isStatic: true, render:{fillStyle: 'brown'}}));
	else
		worldObjects.push(Bodies.rectangle(x, y, w, h, template));
}
 
level_create_fns.push( function(worldObjects) {	 // level 0
	create_common(worldObjects, 650, 450, 60, 540);
	create_obstacle(worldObjects, 650, 480, 100, 40, templates['horiz_space_platform']);
	// build a destructible wall
	// x pos, y pos, # cols, # rows, x spacing, y spacing
	var stack = Composites.stack(450, 400, 1, 4, 5, 0, function(x, y) {
		return Bodies.rectangle(x, y, 30, 30, templates['stack']);
	});
	worldObjects.push(stack);
});

level_create_fns.push( function(worldObjects) {	 // level 1
	create_common(worldObjects, 600, 245, 60, 540);
	create_obstacle(worldObjects, 200, 300, 20, 100, templates['vert_space_platform5']);
	create_obstacle(worldObjects, 150, 100, 20, 100, templates['vert_space_platform5']);
	create_obstacle(worldObjects, 600, 160, 20, 100, templates['vert_space_platform5']);
	create_obstacle(worldObjects, 600, 300, 100, 40, templates['horiz_space_platform']);
	create_obstacle(worldObjects, 600, 300, 100, 40, templates['horiz_space_platform']);
});

level_create_fns.push( function(worldObjects) {	 // level 2
	create_common(worldObjects, 600, 65, 60, 540);
	create_obstacle(worldObjects, 100, 200, 100, 40,templates['horiz_space_platform']);
	create_obstacle(worldObjects, 400, 300, 100, 40,templates['horiz_space_platform']);
	create_obstacle(worldObjects, 270, 100, 20, 100,templates['vert_space_platform5']);
	create_obstacle(worldObjects, 300, 400, 20, 100,templates['vert_space_platform5']);
	create_obstacle(worldObjects, 600, 100, 100, 40,templates['horiz_space_platform']);
});

level_create_fns.push( function(worldObjects) {	 // level 3
	create_common(worldObjects, 660, 275, 60, 540);
	create_obstacle(worldObjects, 600, 150, 80, 350, templates['vert_space_platform5']);
	create_obstacle(worldObjects, 690, 300, 100, 40, templates['horiz_space_platform']);
});
//Last level with changes to the dimensions of objects these changes are to make textures easier
level_create_fns.push( function(worldObjects) {	 // level 4
	create_common(worldObjects, 800, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 640, 295, 200, 80, templates['horiz_space_platform']);
	create_obstacle(worldObjects, 400, 300, 180, 80, templates['horiz_space_platform']);
	create_obstacle(worldObjects, 270, 100, 500, 100, templates['horiz_space_platform']);
	create_obstacle(worldObjects, 370, 525, 60, 300, templates['vert_space_platform5']);
	create_obstacle(worldObjects, -370, 120, 500, 120, templates['horiz_space_platform']);
	create_obstacle(worldObjects, -270, -100, 500, 80, templates['horiz_space_platform']);
	create_obstacle(worldObjects, 840, 525, 60, 300, templates['vert_space_platform5']);
});

level_create_fns.push( function(worldObjects) {	 // level 5
	create_common(worldObjects, 800, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 540, 295, 200, 80, templates['horiz_space_platform']);
	create_obstacle(worldObjects, 40, 230, 200, 80,templates['horiz_space_platform']);
	create_obstacle(worldObjects, 270, 50, 200, 80, templates['horiz_space_platform']);
	create_obstacle(worldObjects, 370, 600, 60, 300, templates['vert_space_platform5']);
	create_obstacle(worldObjects, -370, 120, 200, 80,templates['horiz_space_platform']);
	create_obstacle(worldObjects, -270, -100, 60, 300, templates['vert_space_platform5']);
	create_obstacle(worldObjects, 640, 525, 60, 300, templates['vert_space_platform5']);
});

level_create_fns.push( function(worldObjects) {	 // level 6
	create_common(worldObjects, 550, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 0, -125, 60,300,templates['vert_space_platform5']);	
	create_obstacle(worldObjects, 420, 160, 60, 300,templates['vert_space_platform5']);
	var stackcreate = function(x, y) {
		return Bodies.rectangle(x, y, 20, 20, templates['stack']);
	}
	worldObjects.push(Composites.stack(400, 320, 2, 14, 5, 0, stackcreate));
	
});

level_create_fns.push( function(worldObjects) {	 // Chris level 7
	create_common(worldObjects, 870, 450, 60, 540);

	var texture = "images/Astroid.png";
	var circleStack = Composites.stack(200, 185, 8, 1, 20, 0, function(x, y) {
			return Bodies.circle(x, y, 30, {name:"explode", render:{sprite:{texture: texture, xScale: 1, yScale: 1}}});
	});
	var circleStack = Composites.stack(200, 185, 8, 1, 20, 0, function(x, y) {
			return Bodies.circle(x, y, 30, templates['space_rock']);

		});

	var spinbar = Bodies.rectangle(300, 500, 200, 10, templates['horiz_space_platform23']);
	var spinbar2 = Bodies.rectangle(500, 300, 200, 10, templates['horiz_space_platform1']);
	var spinbar3 = Bodies.rectangle(700, 300, 200, 10, templates['horiz_space_platform23']);
	var bar = Bodies.rectangle(175, 500, 30, 200, templates['vert_space_platform5']);
	var bar2 = Bodies.rectangle(820, 500, 30, 200, templates['vert_space_platform5']);

	worldObjects.push(spinbar);
	worldObjects.push(spinbar2);
	worldObjects.push(spinbar3);
	worldObjects.push(bar);
	worldObjects.push(bar2);
	worldObjects.push(circleStack);
});

level_create_fns.push( function(worldObjects) {	 // Chris level 8
	create_common(worldObjects, 510, 80, 60, 540);
	var circleStack = Composites.stack(200, 185, 8, 1, 20, 0, function(x, y) {
			return Bodies.circle(x, y, 30, {name:"bouncyBall", render:{sprite:{texture: 'images/Astroid.png', xScale: 1, yScale: 1}}});
		});

	var bar = Bodies.rectangle(175, 100, 30, 200, templates['vert_space_platform5']);
	var bar2 = Bodies.rectangle(820, 100, 30, 200, templates['vert_space_platform5']);
	var platform = Bodies.rectangle(500, 100, 120, 30, templates['horiz_space_platform']);
	
	Composites.chain(circleStack, 0.5, 0, -0.5, 0, { stiffness: 0.9 });

	var firstC = Constraint.create({ pointA: { x: 190, y: 200 }, bodyB: circleStack.bodies[0], pointB: {x: -30, y: 0}});
	firstC.name = "firstC";
	var secondC = Constraint.create({ pointA: { x: 805, y: 200 }, bodyB: circleStack.bodies[circleStack.bodies.length-1], pointB: { x: 30, y: 0 } });
	secondC.name="secondC";
	
	worldObjects.push(circleStack, bar, bar2, firstC, secondC, platform);
});

level_create_fns.push( function(worldObjects) {	 // level 9
	create_common(worldObjects, 800, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 640, 200, 140, 1000, templates['vert_space_platform5']);	
	create_obstacle(worldObjects, 840, 100, 200, 40, templates['horiz_space_platform'] );	
});

level_create_fns.push( function(worldObjects) {	 // level 10
	create_common(worldObjects, 1075, 575, 60, 540, 0, 1540, 0, 900);
	var pivot = Bodies.trapezoid(1200, 626, 20, 20, 1, templates['space_triangle']);
	var seesaw = Bodies.rectangle(1200, 600, 400, 20, templates['horiz_space_platform22']);
	worldObjects.push(pivot);
	worldObjects.push(seesaw);
	var stack = Composites.stack(1250, 530, 4, 1, 5, 0, function(x, y) {
		return Bodies.rectangle(x, y, 30, 30, templates['stack']);
	});
	worldObjects.push(stack);
	worldObjects.push(Constraint.create({bodyA:seesaw, pointA:{x:0, y:0}, pointB:{x:1200, y:600}}));
	
	create_obstacle(worldObjects, 1020, 560, 25, 55, templates['vert_space_platform5']);
	create_obstacle(worldObjects, 1130, 560, 25, 55, templates['vert_space_platform5']);
	create_obstacle(worldObjects, 1075, 540, 90, 10, templates['horiz_space_platform']);
	target.mass = 40;
	Matter.Body.updateInertia(target); // Changed mass after creation, so we must call this for accurate physics
});

/***********************************************************************
 *                      Onclick Buttons
 ***********************************************************************/
function set_powerup_type(t)
{
	if (is_playing())
	{
		powerup_type = t;
		current_state = STATE_POWERUP;
		if(powerup_type == 'powerup_teleport_blue' && current_level == 0 && tutorial_state == 1)
			tutorial_state++;
		if(powerup_type == 'powerup_force' && current_level == 0 && tutorial_state == 4)
			tutorial_state++;
	}
}

function set_ball_type(t)
{
	if (is_playing()){
		ball_type = t;
		if(current_level == 0 && tutorial_state == 0)
			tutorial_state++;
	}
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
	for(var i = 1; i < 180; i++)
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

function reset_engine()
{
	// Stop existing simulation
	if (typeof fps_runner.frameRequestId != 'undefined')
		Matter.Runner.stop(fps_runner);

	// Clear previous bodies from world
	World.clear(engine.world);

	// Stop any old events (collision, etc)
	Engine.clear(engine);

	// Start up the engine
	Matter.Runner.run(fps_runner, engine);

	// Freeze simulation
	Matter.Runner.pause(fps_runner);	
}


function run_level(n)
{
	if (typeof level_create_fns[n] != 'function')
	{	// This level is not defined
		n = 0;
	}
	console.log('run_level(' + n + ')');
	
	buttons['Level '+n].options.unlocked = true;
	
	ball_madness = false;
	current_state = STATE_INITIALIZING;

	reset_engine();
	
	ball = target = null;
	ball_bodies = [];
	powerup_bodies = [];
	
	// Reset visualizations
	avis.reset();
	vvis.reset();
	fvis.reset();
	
	// Run visualization initialization
	v_init();
	
	fvis.highlight('START');
	
	// Reset starfield speed
	starfield.vmultiplier = 0.002;
	
	var worldObjects = [];
	level_create_fns[n](worldObjects);

	current_level = n;	// Set global level variable

	World.add(engine.world, worldObjects);
	level_bodies = Matter.Composite.allBodies(engine.world);	// Flat array of bodies in current level
	for (var k in level_bodies)
	{ // Add current bodies to array visualization
		avis.insert({drawfn:draw_body, body:level_bodies[k]});
	}
	
	current_state = STATE_MOUSEUP;
	Matter.Runner.unpause(fps_runner);
}

// Draws a text box centered at (xCenter, yCenter)
function draw_textbox(text, xCenter, yCenter, options)
{
	var defaults = {
		x_margin: 5,
		y_margin: 5,
		backColor: 'white',
		outlineColor: 'black',
		textFrontColor: 'black',
		textBackColor: 'black',
		font: '16px Arial',
		centered: true
	};
	var tb = Matter.Common.extend(defaults, options);

	// Split input into lines
	var lines = text.split('\n');
	
	// Calculate width / height
	ctx.font = tb.font;
	var lineh = pixiGetFontHeight(ctx.font) + tb.y_margin;
	var h = tb.height || (lineh * lines.length + tb.y_margin);
	var w = 0;
	if (tb.width)
		w = tb.width;
	else
	{
		for (var i in lines)
		{
			var tw = ctx.measureText(lines[i]).width;
			if (tw > w)
				w = tw;
		}
		w += 2 * tb.x_margin;
	}
	var x, y;
	if (tb.centered == true)
		x = xCenter - w/2, y = yCenter - h/2;
	else
		x = xCenter, y = yCenter;
	
	ctx.fillStyle = tb.backColor; ctx.strokeStyle = tb.outlineColor;
	ctx.fillRect(x, y, w, h);
	ctx.strokeRect(x, y, w, h);
	
	ctx.textAlign = 'left'; ctx.textBaseline = 'top';
	x += tb.x_margin;
	y += tb.y_margin;
	ctx.fillStyle = tb.textFrontColor;
	ctx.shadowColor = tb.textBackColor;
	ctx.shadowOffsetX = 1;
	ctx.shadowOffsetY = 1;
	ctx.shadowBlur = 3;
	for (i in lines)
	{
		ctx.fillText(lines[i], x, y);
		y += lineh;
	}
	ctx.shadowColor = 'rgba(0,0,0,0)';
}

function init_starfield()
{
	starfield = [];
	starfield.xmin = -3000;
	starfield.xrange = 6000;
	starfield.ymin = -1500;
	starfield.yrange = 3000;
	starfield.zmin = 15;
	starfield.zrange = 900;
	starfield.vmin = 1;
	starfield.vrange = 15;
	starfield.vmultiplier = 2;
	starfield.twinkleChance = 0.001;
	starfield.panX = 0;
	starfield.panY = 0;
	for(var i = 0; i < 600; i++)
	{
		starfield.push({
			x: Math.random() * starfield.xrange + starfield.xmin,
			y: Math.random() * starfield.yrange + starfield.ymin,
			z: Math.random() * starfield.zrange + starfield.zmin,
			v: Math.random() * starfield.vrange + starfield.vmin,
			canvas_x: 0,
			canvas_y: 0,
			prev_x: 0,
			prev_y: 0,
			twinkle: 0,
			fillstyle: 0,
		});
	}
	for(i = 0; i < 100; i++)
		tick_starfield();

	starfield.vmultiplier = 0.002;
	tick_starfield();
}

function resize_starfield(old_width, old_height, new_width, new_height)
{
	var xscale = new_width / old_width;
	var yscale = new_height / old_height;
	for(var i = 0; i < starfield.length; i++)
	{
		var star = starfield[i];
		star.x *= xscale;
		star.y *= yscale;
	}
}

function tick_starfield()
{
	for(var i = 0; i < starfield.length; i++)
	{
		var star = starfield[i];
		star.x += starfield.panX;
		star.y += starfield.panY;
	}
	starfield.panX = starfield.panY = 0;
	var cx = canvas.width / 2;
	var cy = canvas.height / 2;
	var now = Date.now();
	for(i = 0; i < starfield.length; i++)
	{
		star = starfield[i];
		if (star.twinkle > now)
		{  // Star is already twinkling - calculate new color
			var c = Math.floor(0xCC - 0.20 * (star.twinkle - now))
			star.fillStyle = 'rgb(' + c + ',' + c + ',' + c + ')';
		}
		else
		{  // Star is not twinkling - check if it should	
			star.fillStyle = '#cccccc';
			if (Math.random() < starfield.twinkleChance)
				star.twinkle = now + 500;
		}
		
		star.z -= star.v * starfield.vmultiplier;		// Move star forward
		if (star.z <= 0)
		{
			star.x = Math.random() * starfield.xrange + starfield.xmin;
			star.y = Math.random() * starfield.yrange + starfield.ymin;
			star.z = Math.random() * starfield.zrange + starfield.zmin;
			star.v = Math.random() * starfield.vrange + starfield.vmin;
			// Reset these so prev_x,prev_y will be correct
			star.canvas_x = star.x / star.z * 100 + cx;
			star.canvas_y = star.y / star.z * 100 + cy;
		}
		star.prev_x = star.canvas_x;
		star.prev_y = star.canvas_y;
		star.canvas_x = star.x / star.z * 100 + cx;
		star.canvas_y = star.y / star.z * 100 + cy;
		if (star.canvas_x < 0 || star.canvas_x > canvas.width || star.canvas_y < 0 || star.canvas_y > canvas.height)
		{	// Star moved offscreen, generate a new star next frame
			star.z = -1;
		}
	}
}

function draw_starfield()
{
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.lineWidth = 1;
	ctx.strokeStyle = '#cccccc';
	ctx.beginPath();
	for(var i = 0; i < starfield.length; i++)
	{
		var star = starfield[i];
		var dx = star.canvas_x - star.prev_x;
		var dy = star.canvas_y - star.prev_y;
		if ((dx*dx + dy*dy) > 1)
		{
			ctx.moveTo(star.canvas_x, star.canvas_y);
			ctx.lineTo(star.prev_x, star.prev_y);
		}
		else
		{
			ctx.fillStyle = star.fillStyle;
			ctx.fillRect(star.canvas_x, star.canvas_y, 1, 1);
		}
	}
	ctx.stroke();
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

// pos is in world coordinates, distance is also returned in world units
function distance_from_mouse(wpos)
{
	return Vector.magnitude(Vector.sub(wpos, mousePosWorld));
}

/***********************************************************************
 *                      Game state helpers
 ***********************************************************************/
function is_ready_to_fire()
{
	return current_state == STATE_MOUSEUP;
}
 
function is_playing()
{
	return current_state > STATE_INITIALIZING && current_state <= STATE_POWERUP;
}

function is_in_menu()
{
	return current_state >= STATE_START_MENU && current_state <= STATE_INTRO_SCROLL;
}

function is_pausible()
{
	return is_playing() && !is_in_menu();
}

function in_level_select()
{
	return current_state == STATE_LEVEL_SELECT_MENU;
}

function placing_powerup()
{
	return current_state == STATE_POWERUP;
}


init_starfield();
generate_level_buttons();
reset_engine();
current_state = START_STATE;

// Start the first level
//run_level(START_LEVEL);


















