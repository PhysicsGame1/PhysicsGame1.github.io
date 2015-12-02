// Set this variable to true to render the variable visualization
var bRenderVars = false;

// Initialize the visualation
var vvars = new visualization();
vvars.setCanvas(document.getElementById('v_canvas'));
vvars.fontSizeMax = 24;

function render_variables()
{
	if (bRenderVars == false)
		return;
	//vvars.setVariable('test', {pos:{x:8,y:10,z:12}, angle:33});
	vvars.setVariable('ball.position', ball.position);
	vvars.setVariable('ball.velocity', ball.velocity);
	vvars.setVariable('time', fps.timePrev / 1000);
	
	vvars.setRoundingRule('time', 1);
	vvars.showDelta('time', true);
	vvars.render(0, 0, 500, 560);
}

function enable_variables()
{
	bRenderVars = true;
	vvars.needPositionUpdate = true;
}