var v_canvas = document.getElementById('v_canvas');
var vis_tab = 1;

// Contains the variable visualization
var vvis = new variable_visualization();
vvis.setCanvas(v_canvas);

// Contains the array visualization
var avis = new array_visualization();
avis.setCanvas(v_canvas);

// Contains the flowchart visualization
var fvis = new flowchart_visualization();
fvis.setCanvas(v_canvas);

/***********************************************************************
 *                     Visualization Initialization
 ***********************************************************************/
// This function will be called once on each level by matterdemo
function v_init()
{
	vvis.addShownKeys('body', ['position', 'velocity', 'restitution', 'mass', 'name', 'angle', 'isStatic', 'boundaries']);
	vvis.fontSize = 20;
	// Create flowchart nodes
	fvis.terminal('START', 'Start', 0, 0);
	fvis.io('GETPOS', 'Get ball position', 0, 80);
	fvis.io('GETFORCE', 'Get ball force', 0, 160);
	fvis.process('LAUNCH', 'Launch ball', 0, 240);
	fvis.decision('HITCHECK', 'Ball hit target?', 0, 320);
	fvis.terminal('END', 'You win', 0, 400);
	
	// Create arrows between nodes
	fvis.arrow('START', 'south', 'GETPOS', 'north');
	fvis.arrow('GETPOS', 'south', 'GETFORCE', 'north');
	fvis.arrow('GETFORCE', 'south', 'LAUNCH', 'north');
	fvis.arrow('LAUNCH', 'south', 'HITCHECK', 'north');
	fvis.arrow('HITCHECK', 'south', 'END', 'north', 'TRUE');
	fvis.arrow('HITCHECK', 'west', 'GETPOS', 'west', 'FALSE');
	fvis.arrow('END', 'south', 'START', 'north');
	
	fvis.x = 0; fvis.y = 200;
}


// Callback for array visualization
function draw_body(opt, ctx, x, y, sz)
{
	Matter.Render.bodies(engine, [opt.body], ctx, x + sz/2, y + sz/2, sz);
}


/***********************************************************************
 *                     Visualization Buttons
 ***********************************************************************/
var v_buttons = {};

v_buttons['Index--'] = new canvas_button(v_canvas, "Index--", 5, 5, function ()
{
	avis.index = Math.max(0, avis.index - 1);
});

v_buttons['Index++'] = new canvas_button(v_canvas, "Index++", 5, 45, function ()
{
	avis.index = Math.min(avis.array.length-1, avis.index + 1);
});

/***********************************************************************
 *                     Visualization Events
 ***********************************************************************/
var fvis_dragged_object = null;
var fvis_dragged_inverse = false;
var v_mousepos = {x:0, y:0};
function v_mousemove(event)
{
	var x = event.x;
	var y = event.y;
	if (vis_tab == 3 && fvis_dragged_object != null)
	{
		fvis_dragged_object.x += fvis_dragged_inverse ? v_mousepos.x - x : x - v_mousepos.x;
		fvis_dragged_object.y += fvis_dragged_inverse ? v_mousepos.y - y : y - v_mousepos.y;
		fvis.dirty = fvis_dragged_object != fvis;
	}
	/*
	if (vis_tab == 3)
	{
		var id = fvis.id_under_mouse(x, y);
		fvis.highlight(id);
	}
	*/
	
	v_mousepos = {x:x, y:y};
}

function v_mousedown(event)
{
	var x = event.x;
	var y = event.y;
	
	if (vis_tab == 3)
	{
    fvis.snap = false;
		fvis_dragged_object = fvis.node_under_mouse(x, y) || fvis;
		fvis_dragged_inverse = (fvis_dragged_object == fvis);
	}
}

function v_mouseup(event)
{
  fvis.dirty = true;
  fvis.snap = true;
  fvis_dragged_object = null;
	for (var k in v_buttons)
	{
		if (v_buttons[k].mouseup())
			return;
	}
}

// Called every frame from matterdemo.js
function v_updateframe()
{
	if (vis_tab == 1) // Arrays tab
	{
		avis.render();
	}
	else if (vis_tab == 2)  // Variables tab
	{
		// Update visualization with new values
		vvis.setVariable('body', body_at_mouse);
		vvis.render();
	}
	else if (vis_tab == 3)  // Control flow tab
	{
		fvis.render();
	}	
	
	v_buttons['Index++'].options.visible = (vis_tab == 1);
	v_buttons['Index--'].options.visible = (vis_tab == 1);
	
	for (var k in v_buttons)
	{
		v_buttons[k].draw();
	}
}