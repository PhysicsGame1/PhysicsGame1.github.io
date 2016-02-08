// Set this variable to true to render the variable visualization
var bRenderVars = false;

// Initialize the visualation
var vvars = new visualization();
vvars.setCanvas(document.getElementById('v_canvas'));

vvars.addShownKeys('ball', ['position', 'velocity', 'restitution', 'density', 'isSleeping']);
vvars.addShownKeys('target', ['position', 'isSleeping']);
vvars.setRoundingRule('time', 1);

function render_variables()
{
	if (bRenderVars == false)
		return;
	//vvars.setVariable('test', {pos:{r:0.3, test:{s:3.114, v:6.228},x:8,y:10,z:12}, angle:33});
	//vvars.addHiddenKeys('test', ['pos.test.s', 'pos.y']);
	vvars.setVariable('ball', ball);
	vvars.setVariable('target', target);
	
	vvars.setVariable('time', fps_runner.timePrev / 1000);
	vvars.setVariable('current_state', current_state);
	vvars.setVariable('current_level', current_level);
	vvars.render(0, 0, 500, 560);
}

function enable_variables()
{
	bRenderVars = true;
	arrayVis_enableRender.rendering = false;
	renderCF = false;
}