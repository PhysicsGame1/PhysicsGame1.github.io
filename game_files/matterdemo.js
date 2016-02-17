/***********************************************************************
 *                      Global definitions
 ***********************************************************************/
var DEBUG = true;		// Set to true to enable various features for testing
var START_LEVEL = 4;	// This level will be run when the game starts

var canvas = document.getElementById("physicsCanvas");
var ctx = canvas.getContext("2d");

//global variable holding objects for level	
var level_bodies = [];

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
			width:1024,
			height:600
		}
}});

var STATE_INITIALIZING = 0;

var STATE_MOUSEUP = 200;
var STATE_MOUSEDOWN = 300;

var STATE_TARGET_HIT = 400;


var STATE_START_MENU = 600;
var STATE_PAUSE_MENU = 601;
var STATE_LEVEL_SELECT_MENU = 610;


// Tracks the current state of the game
var current_state;
var paused_state;

// Contains functions that help create each level, indexed by level
var level_create_fns = [];

// Common objects accessed by many parts of the code
var ball;
var target;

// Matter.Runner object that tracks framerate
var fps_runner;

// To get mouse events to work must explicitly create mouse constraint now
var mouseConstraint = MouseConstraint.create(engine);

// Most recent mouse position from mosemove function
var mousePos = {x:0, y:0};

// Current level
var current_level = START_LEVEL;

// This function creates the currently selected ball type
var ball_create_fn; set_steel();

// Variable to control the camera, see: matterjs_camera.js
var camera = new matterjs_camera(engine);

// Variable to control the ball spawn zone
var spawn_zone = {x:9001, y:9001, r:100, max_pull:200, divisor:50};

// Frame counter
var frame = 0;

/***********************************************************************
 *                      Buttons
 ***********************************************************************/
var buttons = {};
buttons['Pause'] = new canvas_button(canvas, "Pause", 5, 5, function ()
{
	paused_state = current_state;
	current_state = STATE_PAUSE_MENU;
});

buttons['Debug'] = new canvas_button(canvas, "Debug", 5, 40, function ()
{
	DEBUG = !DEBUG;
	console.log('DEBUG = ' + DEBUG);
});


var ball_madness = false;
buttons['Balls'] = new canvas_button(canvas, "Balls", 5, 75, function ()
{
	ball_madness = !ball_madness;
});

buttons['Start'] = new canvas_button(canvas, "Start", canvas.width / 2, canvas.height / 2 + 50, function ()
{
	run_level(START_LEVEL);
}, {centered:true, font:'bold 28px monospace'});

buttons['Restart'] = new canvas_button(canvas, 'Restart', canvas.width / 2, canvas.height / 2 - 50, function ()
{
	run_level(current_level);
}, {centered:true, font:'bold 24px monospace'});

buttons['Level Select'] = new canvas_button(canvas, 'Level Select', canvas.width / 2, canvas.height / 2, function ()
{
	current_state = STATE_LEVEL_SELECT_MENU;
}, {centered:true, font:'bold 24px monospace'});

buttons['Quit'] = new canvas_button(canvas, 'Quit', canvas.width / 2, canvas.height / 2 + 50, function ()
{
	reset_engine();
	current_state = STATE_START_MENU;
}, {centered:true, font:'bold 24px monospace'});

buttons['Cancel'] = new canvas_button(canvas, 'Cancel', canvas.width / 2, canvas.height / 2 + 100, function ()
{
	current_state = paused_state;
}, {centered:true, font:'bold 24px monospace'});

buttons['Main Menu'] = new canvas_button(canvas, "Main Menu", 5, 5, function ()
{
	current_state = STATE_PAUSE_MENU;
});

/*
	Level select buttons
*/
buttons['Level 0'] = new canvas_button(canvas, 'Level 0', canvas.width / 3, canvas.height / 2 - 50, function ()
{
	
}, {centered:true, font:'bold 24px monospace'});

buttons['Level 1'] = new canvas_button(canvas, 'Level 1', canvas.width /3, canvas.height / 2, function ()
{
	
}, {centered:true, font:'bold 24px monospace'});

buttons['Level 2'] = new canvas_button(canvas, 'Level 2', canvas.width / 3, canvas.height / 2 + 50, function ()
{
	
}, {centered:true, font:'bold 24px monospace'});

buttons['Level 3'] = new canvas_button(canvas, 'Level 3', canvas.width /3, canvas.height / 2 + 100, function ()
{
	
}, {centered:true, font:'bold 24px monospace'});

buttons['Level 4'] = new canvas_button(canvas, 'Level 4', canvas.width * 2/3, canvas.height / 2 - 50, function ()
{
	
}, {centered:true, font:'bold 24px monospace'});

buttons['Level 5'] = new canvas_button(canvas, 'Level 5', canvas.width * 2/3, canvas.height / 2, function ()
{
	
}, {centered:true, font:'bold 24px monospace'});

buttons['Level 6'] = new canvas_button(canvas, 'Level 6', canvas.width * 2/3, canvas.height / 2 + 50, function ()
{
	
}, {centered:true, font:'bold 24px monospace'});

buttons['Level 7'] = new canvas_button(canvas, 'Level 7', canvas.width * 2/3, canvas.height / 2 + 100, function ()
{
	
}, {centered:true, font:'bold 24px monospace'});

//
//buttons['Set Iron'] = new canvas_button(canvas, 'Set Iron', canvas.width / 2, 30, set_iron, {centered:true, image:'images/iron_ball.png'});

/***********************************************************************
 *                      Matter.js events
 ***********************************************************************/
// Set up callbacks for event handling
//mouse events must come through a mouseConstraint
Events.on(mouseConstraint, 'mousedown', mousedown);
Events.on(mouseConstraint, 'mousemove', mousemove);
Events.on(mouseConstraint, 'mouseup', mouseup);
Events.on(engine, 'beforeUpdate', beforeUpdate);
Events.on(engine, 'afterUpdate', afterUpdate);
Events.on(engine, 'collisionEnd', afterCollision);
Events.on(engine, 'afterRender', afterRender);
document.addEventListener('keyup', keyup);
document.addEventListener('keydown', keydown);
canvas.addEventListener("mousewheel", mousewheel, false);

var gp_amount;
var ball_type;

function beforeUpdate(event)
{
	if(current_level == 7)
		checkChrisLevelOne();
}

function checkChrisLevelOne()
{
	for(var i = 0; i < level_bodies.length; ++i)
	{
		k = level_bodies[i];
		var vx = 10 * Math.cos(k.angle + Math.PI);
		var vy = 10 * Math.sin(k.angle + Math.PI);
		if(k.name == "vertSpin")
		{
			//alert("Inside vertSpin. Decision One TRUE. name = " + k.name);
			var py = 100 * Math.sin(engine.timing.timestamp * 0.002);
			var px = 100 * Math.cos(engine.timing.timestamp * 0.002);
			//Body.setVelocity(k, { x: 0, y: 50 - py});
			Body.setAngularVelocity(k, 0.02);
			Body.setPosition(k, { x: k.position.x, y: 450 -  py});
			if(engine.timing.timeScale != 0)
				Body.rotate(k, 0.03);
				
		}
		else if(k.name == "vertSpin2")
		{
			//alert("Inside vertSpin2. Decision Two TRUE. name = " + k.name);
			var py = 150 * Math.sin(engine.timing.timestamp * 0.004);
			var px = 150 * Math.sin(engine.timing.timestamp * 0.004);
			//Body.setVelocity(k, { x: vx, y: vy});
			Body.setAngularVelocity(k, -0.01);
			Body.setPosition(k, { x: k.position.x, y: 550 - py});
			if(engine.timing.timeScale != 0)
				Body.rotate(k, -0.02);
				
		}
		else
		{
			//alert("Failed both decisions. name = " + k.name);
		}
	}
}

function afterUpdate(event)
{
	frame++;
	if (is_ready_to_fire() && ball_madness && frame % 6 == 0)
	{
		var sc = current_state;
		ball_create_fn(spawn_zone);
		current_state = STATE_MOUSEDOWN;
		mouseup({mouse:{position:mouseConstraint.mouse.absolute}});
		current_state = sc;
	}
	
	buttons['Pause'].options.enabled = is_pausible();
	buttons['Main Menu'].options.visible = current_state != STATE_LEVEL_SELECT_MENU;
	buttons['Balls'].options.visible = is_ready_to_fire() && DEBUG;
	buttons['Start'].options.visible = current_state == STATE_START_MENU;
	buttons['Restart'].options.visible = current_state == STATE_PAUSE_MENU;
	buttons['Level Select'].options.visible = current_state == STATE_PAUSE_MENU;
	buttons['Quit'].options.visible = current_state == STATE_PAUSE_MENU;
	buttons['Cancel'].options.visible = current_state == STATE_PAUSE_MENU;
	buttons['Main Menu'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;
	
	buttons['Level 0'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;
	buttons['Level 1'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;
	buttons['Level 2'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;
	buttons['Level 3'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;
	buttons['Level 4'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;
	buttons['Level 5'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;
	buttons['Level 6'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;
	buttons['Level 7'].options.visible = current_state == STATE_LEVEL_SELECT_MENU;

	if (is_in_menu())
	{
		var x = canvas.width / 2; var y = canvas.height / 2;
		buttons['Start'].move(x, y + 50);
		buttons['Restart'].move(x, y - 50);
		buttons['Level Select'].move(x, y)
		buttons['Quit'].move(x, y + 50);
		buttons['Cancel'].move(x, y + 100);
	}

	if(in_level_select()){
		var x = canvas.width / 3; var y = canvas.height / 2;
		buttons['Level 0'].move(x, y - 50);
		buttons['Level 1'].move(x, y);
		buttons['Level 2'].move(x, y + 50);
		buttons['Level 3'].move(x, y + 100);
		buttons['Level 4'].move(x*2, y - 50);
		buttons['Level 5'].move(x*2, y);
		buttons['Level 6'].move(x*2, y + 50);
		buttons['Level 7'].move(x*2, y + 100);
	}
}

// Check to see if the ball collided with the target
function afterCollision(event)
{
	if (!is_playing() || current_state == STATE_TARGET_HIT)
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
			setTimeout(function() { run_level(current_level + 1); }, DEBUG ? 500 : 5000);
			break;
		}
	}
}

function afterRender(event)
{
	// Draw spawn_zone
	var can_pos = worldToCanvasPt(spawn_zone);
	var x = can_pos.x; var y = can_pos.y;
	var r = worldToCanvasCoords(spawn_zone.x + spawn_zone.r, 0).x - can_pos.x; // Hack to get correct radius in canvas coordinates
	// Transparent background...
	ctx.beginPath();
	ctx.fillStyle = 'rgba(66, 99, 200, 0.45)';
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
	if (ball != null)
		Body.redraw(engine, ball);

	if (current_state == STATE_MOUSEDOWN)
	{
		// Determine the force with which the ball would be launched from here
		var mouseDist = Vector.sub(canvasToWorldPt(mousePos), ball.position);
		var angle = Vector.angle(canvasToWorldPt(mousePos), ball.position); //angle between PI and -PI relative to 0 x-axis
		var netF = Math.min(Vector.magnitude(mouseDist), spawn_zone.max_pull);
		
		
		if (DEBUG)
		{ // Draw a trajectory
			netF /= spawn_zone.divisor;
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
		else
		{  // Draw a simple arrow
			var direction = Vector.create(netF*Math.cos(angle), netF*Math.sin(angle));
			var ballpos = worldToCanvasPt(ball.position);
			var arrowtip = worldToCanvasPt(Vector.add(ball.position, direction));
			draw_arrow(ballpos.x, ballpos.y, arrowtip.x, arrowtip.y);	
		}
	}
	
	if (current_state == STATE_TARGET_HIT)
	{
		draw_textbox("Level Complete! The next level will begin soon.", canvas.width/2, canvas.height/2, {
			font:'24px Arial',
			backColor:'#009900',
			outlineColor:'yellow',
			x_margin:30,
			y_margin:20
		});
	}
	
	if (DEBUG && is_playing())
	{
		var cpt = mouseConstraint.mouse.absolute;
		var wpt = canvasToWorldPt(cpt);
		draw_textbox('   FPS:' + round(fps_runner.fps, 2) +
				'\n World:' + round(wpt.x,2) + ',' + round(wpt.y,2) +
				'\nCanvas:' + round(cpt.x,2) + ',' + round(cpt.y,2) +
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
	
	if (is_in_menu())
	{
		ctx.fillStyle = '#009900'; ctx.strokeStyle = 'yellow';
		var x = 0, y = 0, w = canvas.width, h = canvas.height;
		ctx.fillRect(x, y, w, h);
		ctx.strokeRect(x, y, w, h);
		if (current_state == STATE_START_MENU)
		{
			ctx.font = '48px Monospace';
			ctx.fillStyle = 'black';
			ctx.fillText('Physics Game', (w - ctx.measureText('Physics Game').width) / 2, h / 2 - 40);
		}
	}
	
	for (k in buttons)
		buttons[k].draw();
	
	// Run visualization callback
	v_updateframe()
}

function mousedown(event)
{
	var mx = event.mouse.position.x;
	var my = event.mouse.position.y;
	
	for (k in buttons)
	{
		if (buttons[k].mouseup())
			return;
	}
	
	if (is_ready_to_fire())
	{
		// Check for click in spawn zone
		var wpos = canvasToWorldPt(mousePos);
		var dx = wpos.x - spawn_zone.x;
		var dy = wpos.y - spawn_zone.y;
		if (Math.sqrt(dx*dx + dy*dy) > spawn_zone.r)
			return;
		// Spawn a ball
		ball_create_fn(wpos);
		current_state = STATE_MOUSEDOWN;
	}
}


function mousemove(event)
{
	mousePos = event.mouse.position;
	
}

function mouseup(event)
{
	if (current_state != STATE_MOUSEDOWN)
		return;
	var mouseDist = Vector.sub(canvasToWorldPt(event.mouse.position), ball.position);
	
	var angle = Vector.angle(canvasToWorldPt(event.mouse.position), ball.position); //angle between PI and -PI relative to 0 x-axis
	var netF = Math.min(Vector.magnitude(mouseDist), spawn_zone.max_pull) / spawn_zone.divisor;
	var force = Vector.create(netF*Math.cos(angle), netF*Math.sin(angle));
	ball.timeScale = 1;
	Body.applyForce(ball, ball.position, force);
	Body.enableCollisions(ball);
	current_state = STATE_MOUSEUP;
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
	if (event.code == 'KeyS')
	{
		if (current_state == STATE_RUNNING_VISUALIZATION)
			arrayVis_stop();
	}
	else
		console.log(event.code + ' pressed.');
}

function mousewheel(event)
{
	camera.moveZoom(event.wheelDelta / -2);
}


/***********************************************************************
 *                      Level Creation
 ***********************************************************************/
function create_common(worldObjects, xTarget, yTarget, xCannon, yCannon, xmin, xmax, ymin, ymax)
{
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
	worldObjects.push(Bodies.rectangle(xMedian, ymax + 50, xLength + 200, 100, {name:"border", isStatic: true, render:{fillStyle: 'green'} }));	// bottom
	worldObjects.push(Bodies.rectangle(xMedian, ymin - 50, xLength + 200, 100, {name:"border", isStatic: true, render:{fillStyle: 'blue'}}));	// top
	worldObjects.push(Bodies.rectangle(xmin - 50, yMedian, 100, yLength, {name:"border", isStatic: true, render:{fillStyle: 'blue'}}));	// left
	worldObjects.push(Bodies.rectangle(xmax + 50, yMedian, 100, yLength, {name:"border", isStatic: true, render:{fillStyle: 'blue'}}));	// right

	worldObjects.push(target = Body.create({
		position: { x: xTarget, y: yTarget },
		restitution: 0.5,
		vertices: [{ x:0, y: 0 }, { x:-20, y: 10 }, { x:-20, y: 30 }, { x:20, y: 30 }, { x:20, y: 10 }],
		name:"target"
	}));

	spawn_zone.x = xCannon;
	spawn_zone.y = yCannon;
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


level_create_fns.push( function(worldObjects) {	 // level 4
	create_common(worldObjects, 800, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 640, 295, 140, 10);
	create_obstacle(worldObjects, 400, 300, 160, 20);
	create_obstacle(worldObjects, 270, 100, 520, 70);
	create_obstacle(worldObjects, 370, 800, 120, 570);
	create_obstacle(worldObjects, -370, 120, 300, 70);
	create_obstacle(worldObjects, -270, -100, 150, 150);
	create_obstacle(worldObjects, 840, 525, 30, 150);
});

level_create_fns.push( function(worldObjects) {	 // level 5
	create_common(worldObjects, 800, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 540, 295, 140, 10);
	create_obstacle(worldObjects, 40, 230, 160, 20);
	create_obstacle(worldObjects, 270, 50, 320, 70);
	create_obstacle(worldObjects, 370, 800, 120, 570);
	create_obstacle(worldObjects, -370, 120, 150, 70);
	create_obstacle(worldObjects, -270, -100, 60, 100);
	create_obstacle(worldObjects, 640, 525, 50, 70);
});

level_create_fns.push( function(worldObjects) {	 // level 6
	create_common(worldObjects, 550, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 420, 300, 50, 50);
	create_obstacle(worldObjects, 340, -125, 350, 70);	
	create_obstacle(worldObjects, 0, 0, 250, 20);

	var stack = Composites.stack(400, 320, 2, 14, 5, 0, function(x, y) {
		return Bodies.rectangle(x, y, 20, 20, { name:"stack", density: 0.02});
	});
	worldObjects.push(stack);
	
	var stack1 = Composites.stack(400, 100, 2, 8, 5, 0, function(x, y) {
		return Bodies.rectangle(x, y, 20, 20, { name:"stack", density: 0.02});
	});
	worldObjects.push(stack1);
	
});

level_create_fns.push( function(worldObjects) {	 // Chris level 7
	create_common(worldObjects, 870, 450, 60, 540);
		
	var circleStack = Composites.stack(200, 185, 8, 1, 20, 0, function(x, y) {
            return Bodies.circle(x, y, 30, {name:"explode"});
        });

	var spinbar = Bodies.rectangle(300, 500, 200, 10, {name:"vertSpin", isStatic: true, render:{fillStyle: 'brown'}});
	var spinbar2 = Bodies.rectangle(500, 300, 200, 10, {name:"vertSpin2", isStatic: true, render:{fillStyle: 'brown'}});
	var spinbar3 = Bodies.rectangle(700, 300, 200, 20, {name:"vertSpin", isStatic: true, render:{fillStyle: 'brown'}});
	var bar = Bodies.rectangle(175, 500, 30, 200, {name:"vertBar", isStatic: true, render:{fillStyle: 'brown'}});
	var bar2 = Bodies.rectangle(820, 500, 30, 200, {name:"vertBar", isStatic: true, render:{fillStyle: 'brown'}});

	worldObjects.push(spinbar);
	worldObjects.push(spinbar2);
	worldObjects.push(spinbar3);
	worldObjects.push(bar);
	worldObjects.push(bar2);

	worldObjects.push(circleStack);
	
});

/***********************************************************************
 *                      Onclick Buttons
 ***********************************************************************/
function ball_create_common(pos, restitution, density, texture)
{
		ball = Bodies.circle(pos.x, pos.y, 10, {
			name:"ball",
			timeScale: 0,
			density: density,
			restitution: restitution,
			render:{
				sprite:{texture: texture,
					xScale:0.5,
					yScale:0.5
			}}});
			
	// Fix texture position (matter.js changes these in Body.create so it must be set after creation)
	ball.render.sprite.xOffset = 0.5;
	ball.render.sprite.yOffset = 0.5;
	
	Body.updateInertia(ball);
	Body.disableCollisions(ball);
	World.add(engine.world, ball);
	avis.insert({drawfn:draw_body, body:ball});
}
 
function set_iron()
{
	ball_create_fn = function(pos)
	{
		ball_create_common(pos, 0.4, 0.09, 'images/iron_ball.png');
	}
}

function set_steel()
{
	ball_create_fn = function(pos)
	{
		ball_create_common(pos, 0.3, 0.07, 'images/steel_ball.png');
	}
}

function set_rubber()
{
	ball_create_fn = function(pos)
	{
		ball_create_common(pos, 0.9, 0.05, 'images/rubber_ball.png');
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

function reset_engine()
{
	// Stop existing simulation
	if (typeof fps_runner != 'undefined')
		Matter.Runner.stop(fps_runner);

	// Clear previous bodies from world
	World.clear(engine.world);

	// Start up the engine
	fps_runner = Engine.run(engine);
	
	// Freeze simulation
	engine.timing.timeScale = 0;
	
}


function run_level(n)
{
	if (typeof level_create_fns[n] != 'function')
	{	// This level is not defined
		n = 0;
	}
	
	ball_madness = false;
	current_state = STATE_INITIALIZING;
	reset_engine();
	
	ball = target = null;
	
	// Reset visualizations
	avis.reset();
	vvis.reset();
	
	// Run visualization initialization
	v_init();
	
	// Default to black background if no image found
	engine.render.options.background = '#000000';
	
	var imagePath = 'images/nebula' + n + '.jpg';
	checkImage(imagePath,
		function() { engine.render.options.background = imagePath; },
		function() { });
	
	var worldObjects = [];
	level_create_fns[n](worldObjects);

	current_level = n;	// Set global level variable

	World.add(engine.world, worldObjects);
	level_bodies = Matter.Composite.allBodies(engine.world);	// Flat array of bodies in current level
	for (var k in level_bodies)
	{ // Add current bodies to array visualization
		avis.insert({fillStyle: 'pink', drawfn:draw_body, body:level_bodies[k]});
	}

	current_state = STATE_MOUSEUP;
	engine.timing.timeScale = 1;
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
	}
	var tb = Matter.Common.extend(defaults, options);

	var ctxBackup;
	saveProperties(ctx, ctxBackup);	//saveProperties defined in visualize.js
	
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
		for (i in lines)
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
	for (i in lines)
	{
		ctx.fillStyle = tb.textBackColor;
		ctx.fillText(lines[i], x, y);
		ctx.fillStyle = tb.textFrontColor;
		ctx.fillText(lines[i], x + 1, y + 1);
		y += lineh;
	}
	
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

/***********************************************************************
 *                      Game state helpers
 ***********************************************************************/
function is_ready_to_fire()
{
	return current_state == STATE_MOUSEUP;
}
 
function is_playing()
{
	return current_state > STATE_INITIALIZING && current_state <= STATE_MOUSEDOWN;
}

function is_in_menu()
{
	return current_state >= STATE_START_MENU && current_state <= STATE_LEVEL_SELECT_MENU;
}

function is_pausible()
{
	return is_playing() && !is_in_menu();
}

function in_level_select(){
	return current_state >= STATE_LEVEL_SELECT_MENU;
}

reset_engine();
current_state = STATE_START_MENU;

// Start the first level
//run_level(START_LEVEL);