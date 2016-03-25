/***********************************************************************
 *                      Global definitions
 ***********************************************************************/
var DEBUG = true;		// Set to true to enable various features for testing
var START_LEVEL = 10;	// This level will be run when the game starts

var canvas = document.getElementById("physicsCanvas");
var ctx = canvas.getContext("2d");

//global variable holding objects for level	
var level_bodies = [];
//global variable holding powerups
var powerup_bodies = [];

var Engine = Matter.Engine,								//manages updating and rendering canvas
		World = Matter.World,							//composite of entire canvas
		Bodies = Matter.Bodies,							//used to create shapes within canvas
		Body = Matter.Body,								//used to manipulated created bodies in canvas
		Events = Matter.Events,							//used for mouse events like mousdown, mousemove, and mouseup
		Composite = Matter.Composite,					//to clear constraints from the ball before fired and modify composites (remove doesn't work?!)
		Composites = Matter.Composites,					//used to build composites (combining lots of shapes into structures like walls etc)
		Vector = Matter.Vector,							//for vector algebra
		Constraint = Matter.Constraint;					//for chaining object's together with composites,
	

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
var STATE_POWERUP = 350;

var STATE_TARGET_HIT = 400;

var STATE_START_MENU = 600;
var STATE_PAUSE_MENU = 601;
var STATE_LEVEL_SELECT_MENU = 610;


// Tracks the current state of the game
var current_state;
var paused_state;

var powerup_enabled = false;
var powerup_create_fn = function() {};

// Contains functions that help create each level, indexed by level
var level_create_fns = [];

// Common objects accessed by many parts of the code
var ball;
var target;

// Matter.Runner object that tracks framerate
var fps_runner = Matter.Runner.create();

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

//Teleport Global variable
var teleport_BLUE = false;
var teleport_ORANGE = false;

// Variable to hold necessary data to generate the background starfield
// Note: Starfield algorithm from http://freespace.virgin.net/hugo.elias/graphics/x_stars.htm
var starfield = [];
starfield.xmin = -3000;
starfield.xrange = 6000;
starfield.ymin = -1500;
starfield.yrange = 3000;
starfield.zmin = 10;
starfield.zrange = 900;
starfield.vmin = 1;
starfield.vrange = 15;
starfield.vmultiplier = 0.002;
for(var i = 0; i < 3000; i++)
{
	starfield.push({
		x: Math.random() * starfield.xrange + starfield.xmin,
		y: Math.random() * starfield.yrange + starfield.ymin,
		z: Math.random() * starfield.zrange + starfield.zmin,
		v: Math.random() * starfield.vrange + starfield.vmin,
		canvas_x: 0,
		canvas_y: 0,
		prev_x: 0,
		prev_y: 0
	});
}
for(i = 0; i < 500; i++)
	tick_starfield();

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

buttons['Textures'] = new canvas_button(canvas, "Textures", 5, 110, function ()
{
	this.options.textures = !this.options.textures;
	if (this.options.textures)
	{
		for(var i in level_bodies)
		{
			var r = level_bodies[i].render;
			if (r.prev_texture)
			{
				r.sprite.texture = r.prev_texture;
			}
		}
	}
	else
	{
		for(var i in level_bodies)
		{
			var r = level_bodies[i].render;
			if (r.sprite.texture)
			{
				r.prev_texture = r.sprite.texture;
				r.sprite.texture = '';
			}
		}
	}
}, {textures:true});

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
  Matter.Runner.unpause(fps_runner);
	current_state = paused_state;
}, {centered:true, font:'bold 24px monospace'});

buttons['Main Menu'] = new canvas_button(canvas, "Main Menu", 5, 5, function ()
{
	current_state = STATE_PAUSE_MENU;
});



/*
	Level select buttons
*/

function generate_level_buttons(num_levels)
{
	var num_columns = 2;
	var num_rows = Math.ceil(num_levels / num_columns);
	
	var x_space = canvas.width / (num_columns+1);
	var y_space = 50;
	
	var x = 1;
	var y = 1;
	for(var i = 0; i < num_levels; i++)
	{
		buttons['Level ' + i] = new canvas_button(canvas, 'Level ' + i, x * x_space, 100 + y*y_space, function ()
		{
			run_level(this.options.level);
		}, {centered:true, font:'bold 24px monospace', enabled:false, level:i, unlocked:false});
		
		y += 1;
		if (y > num_rows)
		{
			x += 1;
			y = 1;
		}
	}
	
	buttons['Level 0'].options.unlocked = true;
}

//buttons['Set Iron'] = new canvas_button(canvas, 'Set Iron', canvas.width / 2, 30, set_iron, {centered:true, image:'images/iron_ball.png'});

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
  mousePos = {x:mx-game_bounds.left, y:my-game_bounds.top}; // matterdemo global
  
  
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
      mousedown(mousePos);
      mouseevent.lastClick = 'game';
    }
  }
  else if (event.type == 'mousemove')
  {
    v_mousemove(vis_relative);
  }
  else if (event.type == 'mouseup')
  {
    // Only want to fire mouseup if mousedown was previously invoked to the same canvas
    if (mouseevent.lastClick == 'visualization')
      v_mouseup(vis_relative);
    else if (mouseevent.lastClick == 'game')
      mouseup(mousePos);
    mouseevent.lastClick = '';
  }
  //console.log(event.type);
}

function beforeUpdate(event)
{	
	tick_starfield();
	
	if(ball && powerup_enabled)
		checkPowerupHit(); //must be called after game is set up
		
	if(current_level == 7)
		checkChrisLevelOne();
}


//if this function is called it should always be the case that we can find a powerup
//just in case make sure though. . .
function checkPowerupHit()
{
	var powerup;
	for(var i = 0; i < powerup_bodies.length; ++i)
	{
		powerup = powerup_bodies[i];
		
		var vec = Vector.create(ball.position.x - powerup.position.x, ball.position.y - powerup.position.y);
		var distanceToClick = Vector.magnitude(vec);
		//alert(distanceToClick);	
		//alert(worldToCanvasRatio);
		var factor = 4;
		var radius = powerup.circleRadius*factor; //this is diameter of every powerup
	//	alert(distanceToClick);
	//console.log("POWERUP = ", powerup.position);
	
	    //other possible solution is to use Matter.SAT.collision
		if (distanceToClick <= radius) //powerup hits LATEST ball created
		{
			//alert("FOUND POWERUP");
			if(powerup.name=="powerup_force"){
				var netF = 2;
				var force = Vector.create(netF*Math.sin(powerup.angle), -netF*Math.cos(powerup.angle));
				//console.log("FORCE ANGLE = ", 180*powerup.angle/Math.PI);
				Body.applyForce(ball, ball.position, force);
				Composite.remove(engine.world, powerup, true);
				powerup_bodies[i] = powerup_bodies[powerup_bodies.length-1]; //overwrite current powerup with end powerup
				powerup_bodies.pop(); //remove duplicate at end
				avis.removeByFn(function(o) { return o.body.name == 'powerup_force'; });
			}
			else if(powerup.name=="powerup_teleport_blue"){
				if(teleport_ORANGE){
					
					var deltax = -(teleport_BLUE.position.x - teleport_ORANGE.position.x);
					var deltay = -(teleport_BLUE.position.y - teleport_ORANGE.position.y);
					Body.translate(ball, {x:deltax,y:deltay});
					Composite.remove(engine.world, powerup, true);
					powerup_bodies[i] = powerup_bodies[powerup_bodies.length-1]; //overwrite current powerup with end powerup
					powerup_bodies.pop(); //remove duplicate at end
					avis.removeByFn(function(o) { return o.body.name == 'powerup_teleport_blue'; });
				}
				
			}
			else if(powerup.name=="powerup_teleport_orange"){
				if(teleport_BLUE){
					
					Composite.remove(engine.world, powerup, true);
					powerup_bodies[i] = powerup_bodies[powerup_bodies.length-1]; //overwrite current powerup with end powerup
					powerup_bodies.pop(); //remove duplicate at end
					teleport_ORANGE= false;
					teleport_BLUE = false;
					avis.removeByFn(function(o) { return o.body.name == 'powerup_teleport_orange'; });
				}
				
				//alert("teleport_Blue_x = "+ teleport_BLUE.position.x);
			}	
		
			//remove powerup once triggered
			//remove from powerup_bodies and from the world?
			//console.log(powerup.type);
			//alert(engine.world);
			
			
		}
	}
}

function checkChrisLevelOne()
{
	for(var i = 0; i < level_bodies.length; ++i)
	{
		var k = level_bodies[i];
		//var vx = 10 * Math.cos(k.angle + Math.PI);
		//var vy = 10 * Math.sin(k.angle + Math.PI);
		if(k.name == "vertSpin")
		{
			//alert("Inside vertSpin. Decision One TRUE. name = " + k.name);
			var py = 100 * Math.sin(engine.timing.timestamp * 0.002);
			//var px = 100 * Math.cos(engine.timing.timestamp * 0.002);
			//Body.setVelocity(k, { x: 0, y: 50 - py});
			Body.setAngularVelocity(k, 0.02);
			Body.setPosition(k, { x: k.position.x, y: 450 -  py});
			Body.rotate(k, 0.03);
				
		}
		else if(k.name == "vertSpin2")
		{
			//alert("Inside vertSpin2. Decision Two TRUE. name = " + k.name);
			var py = 150 * Math.sin(engine.timing.timestamp * 0.004);
			//var px = 150 * Math.sin(engine.timing.timestamp * 0.004);
			//Body.setVelocity(k, { x: vx, y: vy});
			Body.setAngularVelocity(k, -0.01);
			Body.setPosition(k, { x: k.position.x, y: 550 - py});
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
	if (is_ready_to_fire() && ball_madness && fps_runner.frameCounter % 6 == 0)
	{
		var sc = current_state;
		ball_create_fn(spawn_zone);
		current_state = STATE_MOUSEDOWN;
		mouseup(mousePos);
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
					camera.moveZoom(DEBUG ? -40 : -4);
					starfield.vmultiplier += DEBUG ? 0.2 : 0.02;
					setTimeout(_starfield_speedup, 15);
				}
			};
			updateVisTime(current_tab);
			level_name = 'level name: '+current_level;
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
		
	var i;
	for(i = 0; i < level_create_fns.length; i++)
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
	if (current_state == STATE_MOUSEDOWN)
	{
		// Determine the force with which the ball would be launched from here
		var mouseDist = Vector.sub(canvasToWorldPt(mousePos), ball.position);
		var angle = Vector.angle(canvasToWorldPt(mousePos), ball.position); //angle between PI and -PI relative to 0 x-axis
		var netF = Math.min(Vector.magnitude(mouseDist), spawn_zone.max_pull);
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
			for(var i in futurePositions)
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
		var cpt = mousePos;
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
		if (current_state == STATE_START_MENU)
		{
			tick_starfield();
			ctx.font = '48px Monospace';
			ctx.fillStyle = 'white';
			ctx.fillText('Physics Game', (canvas.width - ctx.measureText('Physics Game').width) / 2, canvas.height / 2 - 40);
		}
    else
    {
      ctx.fillStyle = 'rgba(200,200,200,0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }    
	}
	
	for (var k in buttons)
		buttons[k].draw();
	
	// Run visualization callback
	v_updateframe();
}

function mousedown(event)
{
	var wpos = canvasToWorldPt(mousePos);
	
	//alert(powerup_bodies.length);
	for(var i = 0; i < powerup_bodies.length; ++i)
	{	
		var powerup = powerup_bodies[i];
		//check for click on powerup
		if(powerup.name == "powerup_force")
		{
			//alert("HERE");
			var vec = Vector.create(wpos.x - powerup.position.x, wpos.y - powerup.position.y);
			var distanceToClick = Vector.magnitude(vec);
			//alert(distanceToClick);	
			var radius = powerup.circleRadius*2; //this is diameter of every powerup
		//	alert(distanceToClick);
			if (distanceToClick <= radius) //mouse slick is inside
			{
				//var mouseDist = Vector.sub(canvasToWorldPt(event.mouse.position), powerup.position);
				var offset = Math.PI*0.5; //offset for force powerup to 0 degrees right instead of up
				var angle = -offset + Vector.angle(wpos, powerup.position); //angle between PI and -PI relative to 0 x-axis
				var test = (Math.PI*180/angle)%360;
				/*
				if(test < 0)
					test += 360;
				console.log("ANGLE = ", test);
				*/
				Body.setAngle(powerup, angle);
			}
		}
	}
	

	
	var dx,dy;
	//check to see if they want to place a powerup
	if(current_state == STATE_POWERUP)
	{
		dx = wpos.x - spawn_zone.x;
		dy = wpos.y - spawn_zone.y;
		if (Math.sqrt(dx*dx + dy*dy) <= spawn_zone.r) //don't place powerup in spawn zone
			return;
		powerup_create_fn(wpos);
		current_state = STATE_MOUSEUP;
	}
	
	if (is_ready_to_fire())
	{
		// Check for click in spawn zone
		dx = wpos.x - spawn_zone.x;
		dy = wpos.y - spawn_zone.y;
		if (Math.sqrt(dx*dx + dy*dy) > spawn_zone.r)
			return;
		// Spawn a ball
		ball_create_fn(wpos);
		balls_used++;
		current_state = STATE_MOUSEDOWN;
		fvis.highlight('GETFORCE');
	}
}

function mouseup(event)
{
	if (current_state == STATE_MOUSEDOWN)
	{
		var mouseDist = Vector.sub(canvasToWorldPt(mousePos), ball.position);

		var angle = Vector.angle(canvasToWorldPt(mousePos), ball.position); //angle between PI and -PI relative to 0 x-axis
		var netF = Math.min(Vector.magnitude(mouseDist), spawn_zone.max_pull) / spawn_zone.divisor;
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
}

function mousewheel(event)
{
	camera.moveZoom(event.wheelDelta / -2);
}

// Runs when page resizes
function windowresize()
{
	// Reposition canvas buttons
	var x = canvas.width / 2; var y = canvas.height / 2;
	buttons['Start'].move(x, y + 50);
	buttons['Restart'].move(x, y - 50);
	buttons['Level Select'].move(x, y);
	buttons['Quit'].move(x, y + 50);
	buttons['Cancel'].move(x, y + 100);
}

/***********************************************************************
 *                      Level Creation
 ***********************************************************************/
 var worldToCanvasRatio = 0;
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
	/*
	 render: {
                visible: true,
                sprite: {
                    xScale: 1,
                    yScale: 1,
                    xOffset: 0,
                    yOffset: 0
                },
                lineWidth: 1.5
            }
	*/
	// Create the world borders
	worldObjects.push(Bodies.rectangle(xMedian, ymax + 50, xLength + 200, 100, {name:"border", isStatic: true, render:{visible: false} }));	// bottom
	worldObjects.push(Bodies.rectangle(xMedian, ymin - 50, xLength + 200, 100, {name:"border", isStatic: true, render:{visible: false}}));	// top
	worldObjects.push(Bodies.rectangle(xmin - 50, yMedian, 100, yLength, {name:"border", isStatic: true, render:{visible: false}}));	// left
	worldObjects.push(Bodies.rectangle(xmax + 50, yMedian, 100, yLength, {name:"border", isStatic: true, render:{visible: false}}));	// right fillStyle: 'blue'

	worldObjects.push(target = Body.create({
		mass: 6,
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
	/*
	{
				sprite:{texture: texture,
					xScale:0.1,
					yScale:0.1
			}}
	*/
	var texture = "images/Astroid.png";
	var stack = Composites.stack(450, 400, 1, 4, 5, 0, function(x, y) {
		return Bodies.rectangle(x, y, 30, 30, {name:"stack1", density: 0.02, render:{sprite:{ texture: texture, xScale:.5, yScale:.5}}});
		//return Bodies.rectangle(x, y, 30, 30, { name:"stack", density: 0.02});
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
	worldToCanvasRatio = 1; //get scaling factor for collision detection
});

level_create_fns.push( function(worldObjects) {	 // level 2
	create_common(worldObjects, 600, 65, 60, 540);
	create_obstacle(worldObjects, 100, 200, 60, 20);
	create_obstacle(worldObjects, 400, 300, 60, 20);
	create_obstacle(worldObjects, 270, 100, 20, 70);
	create_obstacle(worldObjects, 300, 400, 30, 90);
	create_obstacle(worldObjects, 600, 100, 60, 40);
	worldToCanvasRatio = 1; //get scaling factor for collision detection
});

level_create_fns.push( function(worldObjects) {	 // level 3
	create_common(worldObjects, 640, 275, 60, 540);
	create_obstacle(worldObjects, 600, 100, 40, 400);
	create_obstacle(worldObjects, 640, 295, 40, 10);
	worldToCanvasRatio = 1; //get scaling factor for collision detection
});

level_create_fns.push( function(worldObjects) {	 // level 4
	create_common(worldObjects, 800, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 640, 295, 140, 10);
	create_obstacle(worldObjects, 400, 300, 160, 20);
	create_obstacle(worldObjects, 270, 100, 520, 70);
	create_obstacle(worldObjects, 370, 525, 120, 150);
	create_obstacle(worldObjects, -370, 120, 300, 70);
	create_obstacle(worldObjects, -270, -100, 150, 150);
	create_obstacle(worldObjects, 840, 525, 30, 150);
	worldToCanvasRatio = 4; //get scaling factor for collision detection (2*Area * 2*Area / Area) = 4

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
	worldToCanvasRatio = 4; //get scaling factor for collision detection

});

level_create_fns.push( function(worldObjects) {	 // level 6
	create_common(worldObjects, 550, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 420, 300, 50, 50);
	create_obstacle(worldObjects, 340, -125, 350, 70);	
	create_obstacle(worldObjects, 0, 0, 250, 20);
	var texture = "images/Astroid.png";
	var stack = Composites.stack(400, 320, 2, 14, 5, 0, function(x, y) {
		return Bodies.rectangle(x, y, 20, 20, {name:"stack", density: 0.02, render:{sprite:{ texture: texture, xScale:.5, yScale:.5}}});
		//return Bodies.rectangle(x, y, 20, 20, { name:"stack", density: 0.02});
	});
	worldObjects.push(stack);
	
		

	var stack1 = Composites.stack(400, 100, 2, 8, 5, 0, function(x, y) {
		return Bodies.rectangle(x, y, 20, 20, {name:"stack1", density: 0.02, render:{sprite:{ texture: texture, xScale:.5, yScale:.5}}});
	});
	worldObjects.push(stack1);
	worldToCanvasRatio = 4; //get scaling factor for collision detection

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
	worldToCanvasRatio = 1; //get scaling factor for collision detection
});

level_create_fns.push( function(worldObjects) {	 // Chris level 8
	create_common(worldObjects, 510, 80, 60, 540);
		
	var circleStack = Composites.stack(200, 185, 8, 1, 20, 0, function(x, y) {
            return Bodies.circle(x, y, 30, {name:"explode"});
        });

	var bar = Bodies.rectangle(175, 100, 30, 200, {name:"vertBar", isStatic: true, render:{fillStyle: 'brown'}});
	var bar2 = Bodies.rectangle(820, 100, 30, 200, {name:"vertBar", isStatic: true, render:{fillStyle: 'brown'}});
	var platform = Bodies.rectangle(500, 100, 120, 30, {name:"horizBar", isStatic: true, render:{fillStyle: 'brown'}});
	
	Composites.chain(circleStack, 0.5, 0, -0.5, 0, { stiffness: 0.9 });

	var firstC = Constraint.create({ pointA: { x: 190, y: 200 }, bodyB: circleStack.bodies[0], pointB: {x: -30, y: 0}});
	firstC.name = "firstC";
	var secondC = Constraint.create({ pointA: { x: 805, y: 200 }, bodyB: circleStack.bodies[circleStack.bodies.length-1], pointB: { x: 30, y: 0 } });
	secondC.name="secondC";
	
	worldObjects.push(circleStack, bar, bar2, firstC, secondC, platform);
	worldToCanvasRatio = 1; //get scaling factor for collision detection

});

level_create_fns.push( function(worldObjects) {	 // level 9
	create_common(worldObjects, 800, 550, -800, 540, -1024, 1024, -600, 600);
	create_obstacle(worldObjects, 640, 0, 140, 1600);
	worldToCanvasRatio = 4; //get scaling factor for collision detection
	
});

level_create_fns.push( function(worldObjects) {	 // level 10
	create_common(worldObjects, 1075, 575, 60, 540, 0, 1540, 0, 900);
	var pivot = Bodies.trapezoid(1200, 626, 20, 20, 1, {name:'pivot', isStatic:true, render:{fillStyle: 'brown'}});
	var seesaw = Bodies.rectangle(1200, 600, 400, 20, {name:'balance', mass:130});
	Matter.Body.updateInertia(seesaw);
	worldObjects.push(pivot);
	worldObjects.push(seesaw);
	var stack = Composites.stack(1250, 530, 4, 1, 5, 0, function(x, y) {
		var texture = "images/Astroid.png";
		
		return Bodies.rectangle(x, y, 30, 30, {name:"stack1", mass: 15, render:{sprite:{ texture: texture, xScale:.5, yScale:.5}}});
	});
	worldObjects.push(stack);
	worldObjects.push(Constraint.create({bodyA:seesaw, pointA:{x:0, y:10}, pointB:{x:1200, y:610}}));
	
	create_obstacle(worldObjects, 1020, 565, 20, 50);
	create_obstacle(worldObjects, 1130, 565, 20, 50);
	create_obstacle(worldObjects, 1075, 540, 90, 10);
	target.mass = 40;
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
	
	Body.updateInertia(ball);
	Body.disableCollisions(ball);
	World.add(engine.world, ball);
	level_bodies.push(ball);
	avis.insert({drawfn:draw_body, body:ball});
}
 
function set_iron()
{
	ball_create_fn = function(pos)
	{
		ball_create_common(pos, 0.4, 0.09, 'images/iron_ball.png');
	};
}

function set_steel()
{
	ball_create_fn = function(pos)
	{
		ball_create_common(pos, 0.3, 0.07, 'images/steel_ball.png');
	};
}

function set_rubber()
{
	ball_create_fn = function(pos)
	{
		ball_create_common(pos, 0.9, 0.05, 'images/rubber_ball.png');
	};
}
 

//icon from: https://cdn2.iconfinder.com/data/icons/interface-6/60/power_arrow_up-512.png
function set_powerupforce()
{
	current_state = STATE_POWERUP;
	powerup_enabled = true;
	powerup_create_fn = function(pos) //create function to call powerup and place at pos
	{
		var texture = "images/powerupforce.png";
		var powerup = Bodies.circle(pos.x, pos.y, 25.6, {
			name:"powerup_force",
			angle: 0, //zero degrees is up for some reason
			isStatic: true,
			render:{
				sprite:{texture: texture,
					xScale:0.1,
					yScale:0.1
			}}
		});
		//console.log("MY ANGLE = ", 180*powerup.angle/Math.PI);
		Body.disableCollisions(powerup);	//powerup should be "invisible" however turning off collisions mean no collision detection
		World.add(engine.world, powerup);
		powerup_bodies.push(powerup);
		level_bodies.push(powerup);
		avis.insert({drawfn:draw_body, body:powerup});
	};
}

//icon from: https://cdn2.iconfinder.com/data/icons/interface-6/60/power_arrow_up-512.png
function set_powerup_teleport_orange()
{
	current_state = STATE_POWERUP;
	powerup_enabled = true;
	
	powerup_create_fn = function(pos) //create function to call powerup and place at pos
	{
		var texture = "images/Teleport_Symbol_end.png";
		var powerup = Bodies.circle(pos.x, pos.y, 22.4, {
			name:"powerup_teleport_orange",
			isStatic: true,
			render:{
				sprite:{texture: texture,
					xScale:0.4,
					yScale:0.4}}
		});
		Body.disableCollisions(powerup);	//powerup should be "invisible" however turning off collisions mean no collision detection
		World.add(engine.world, powerup);
		powerup_bodies.push(powerup); //must add powerup to level bodies here to access in beforeUpdate
		level_bodies.push(powerup);
		avis.insert({drawfn:draw_body, body:powerup});
		teleport_ORANGE = powerup;
	};
}

function set_powerup_teleport_blue()
{	
	current_state = STATE_POWERUP;
	powerup_enabled = true;
	
	powerup_create_fn = function(pos) //create function to call powerup and place at pos
	{
		var texture1 = "images/Teleport_Symbol.png";
		var powerup = Bodies.circle(pos.x, pos.y, 22.4, {
			name:"powerup_teleport_blue",
			isStatic: true,
			render:{
				sprite:{texture: texture1,
					xScale:0.4,
					yScale:0.4}}
		});
		
		
		Body.disableCollisions(powerup);	//powerup should be "invisible" however turning off collisions mean no collision detection
		World.add(engine.world, powerup);
		powerup_bodies.push(powerup); //must add powerup to level bodies here to access in beforeUpdate
		level_bodies.push(powerup);
		avis.insert({drawfn:draw_body, body:powerup});
		teleport_BLUE = powerup;
	};
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
		avis.insert({fillStyle: 'pink', drawfn:draw_body, body:level_bodies[k]});
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

function tick_starfield()
{
	// Draw star field
	var cx = canvas.width / 2;
	var cy = canvas.height / 2;
	for(i in starfield)
	{
		var star = starfield[i];
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
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.lineWidth = 1;
	ctx.strokeStyle = '#cccccc';
	ctx.beginPath();
	for(i in starfield)
	{
		var star = starfield[i];
		ctx.moveTo(star.canvas_x, star.canvas_y);
		ctx.lineTo(star.prev_x, star.prev_y);
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


generate_level_buttons(level_create_fns.length);
reset_engine();
current_state = STATE_START_MENU;

// Start the first level
//run_level(START_LEVEL);