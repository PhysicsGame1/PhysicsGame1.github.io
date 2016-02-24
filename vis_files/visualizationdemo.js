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
	vvis.addShownKeys('ball', ['position', 'velocity', 'restitution', 'density']);
	vvis.addShownKeys('target', ['position']);
	
	// Create flowchart nodes
	fvis.terminal('START', 'Start', 0, 0);
	fvis.io('GETPOS', 'Get ball position', 0, 100);
	fvis.io('GETFORCE', 'Get ball force', 0, 200);
	fvis.process('LAUNCH', 'Launch ball', 0, 300);
	fvis.decision('HITCHECK', 'Ball hit target?', 0, 400);
	fvis.terminal('END', 'You win', 0, 500);
	
	// Create arrows between nodes
	fvis.arrow('START', 'down', 'GETPOS', 'up');
	fvis.arrow('GETPOS', 'down', 'GETFORCE', 'up');
	fvis.arrow('GETFORCE', 'down', 'LAUNCH', 'up');
	fvis.arrow('LAUNCH', 'down', 'HITCHECK', 'up');
	fvis.arrow('HITCHECK', 'down', 'END', 'up', 'TRUE');
	fvis.arrow('HITCHECK', 'left', 'GETPOS', 'left', 'FALSE');
	
	fvis.x = 0; fvis.y = 250;
}


// Callback for array visualization
function draw_body(opt, ctx, x, y, sz)
{
	Matter.Body.drawAt(engine, opt.body, ctx, x + sz/2, y + sz/2, sz);
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
	avis.index = Math.min(avis.count-1, avis.index + 1);
});

/***********************************************************************
 *                     Visualization Events
 ***********************************************************************/
//vis_canvas.addEventListener('mousemove', v_mousemove);
//vis_canvas.addEventListener('mousedown', v_mousedown);
v_canvas.addEventListener('mouseup', v_mouseup);

//function v_mousemove(event) {}
//function v_mousedown(event) {}

function v_mouseup(event)
{
	for (k in v_buttons)
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
		vvis.setVariable('ball', ball);
		vvis.setVariable('target', target);
		vvis.render(0, 0, 500, 560);
	}
	else if (vis_tab == 3)  // Control flow tab
	{
		fvis.render();
	}	
	
	v_buttons['Index++'].options.visible = (vis_tab == 1);
	v_buttons['Index--'].options.visible = (vis_tab == 1);
	
	for (k in v_buttons)
	{
		v_buttons[k].draw();
	}
}