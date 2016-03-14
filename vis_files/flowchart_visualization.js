/*
	nodes
		.type			"termina", "decision", "io", or "process"
		.text
		.x				x-coordinate of center of node
		.y				y-coordinate of center of node
		
		.left
		.right
		.up
		.down
			
*/

function flowchart_visualization()
{
	this.texth = 24;
	this.portkeys = {east:true, north:true, south:true, west:true};
	this.reset();
}

flowchart_visualization.prototype.setCanvas = function (canvas)
{
    this.outputCanvas = canvas;
    this.outputContext = canvas.getContext('2d');
};

flowchart_visualization.prototype.reset = function()
{
	this.nodes = {};
	this.x = 0;
	this.y = 0;
};

flowchart_visualization.prototype.center_on = function(id)
{
	if (typeof this.nodes[id] != 'undefined')
	{
		this.x = this.nodes[id].x;
		this.y = this.nodes[id].y;
	}
}

flowchart_visualization.prototype.get_by_id = function(id)
{
	return this.nodes[id];
}

flowchart_visualization.prototype.terminal = function(id, text, x, y)
{
	this.nodes[id] = new flowchart_node("terminal", text, x, y, this.texth);
	this.nodes[id].drawfn = function(ctx)
	{
		var x = this.x, y = this.y;
		ctx.beginPath();
		ctx.moveTo(x - this.textw, this.iymin);
		ctx.arcTo(x - this.textw - 500, y, x - this.textw, this.iymax, 25);
		ctx.lineTo(x + this.textw, this.iymax);
		ctx.arcTo(x + this.textw + 500, y, x + this.textw, this.iymin, 25);
		ctx.closePath();
		this.finish_draw(ctx);
	}.bind(this.nodes[id]);
	return this.nodes[id];
};

flowchart_visualization.prototype.decision = function(id, text, x, y)
{
	this.nodes[id] = new flowchart_node("decision", text, x, y, this.texth);
	this.nodes[id].drawfn = function(ctx)
	{
		ctx.beginPath();
		ctx.moveTo(this.ixmin, this.y);
		ctx.lineTo(this.x, this.iymax);
		ctx.lineTo(this.ixmax, this.y);
		ctx.lineTo(this.x, this.iymin);
		ctx.closePath();
		this.finish_draw(ctx);
	}.bind(this.nodes[id]);
	return this.nodes[id];
};

flowchart_visualization.prototype.io = function(id, text, x, y)
{
	this.nodes[id] = new flowchart_node("io", text, x, y, this.texth);
	this.nodes[id].drawfn = function(ctx)
	{
		ctx.beginPath();
		ctx.moveTo(this.x - this.textw, this.iymin);
		ctx.lineTo(this.ixmin, this.iymax);
		ctx.lineTo(this.x + this.textw, this.iymax);
		ctx.lineTo(this.ixmax, this.iymin);
		ctx.closePath();
		this.finish_draw(ctx);
	}.bind(this.nodes[id]);
	return this.nodes[id];
};

flowchart_visualization.prototype.process = function(id, text, x, y)
{
	this.nodes[id] = new flowchart_node("process", text, x, y, this.texth);
	this.nodes[id].drawfn = function(ctx)
	{
		ctx.beginPath();
		ctx.moveTo(this.ixmin, this.iymin);
		ctx.lineTo(this.ixmin, this.iymax);
		ctx.lineTo(this.ixmax, this.iymax);
		ctx.lineTo(this.ixmax, this.iymin);
		ctx.closePath();
		this.finish_draw(ctx);
	}.bind(this.nodes[id]);
	return this.nodes[id];
};

flowchart_visualization.prototype.arrow = function(sourceID, sourcePort, destID, destPort, label)
{
	if (typeof this.nodes[sourceID] == 'undefined' || typeof this.nodes[destID] == 'undefined')
	{
		console.warn('flowchart_visualization.arrow: ' + sourceID + ' or ' + destID + ' does not exist');
		return;
	}
	if (!this.portkeys[sourcePort] || !this.portkeys[destPort])
	{
		console.warn('flowchart_visualization.arrow: ' + sourcePort + ' or ' + destPort + ' is not a valid port');
		return;
	}
	this.nodes[sourceID][sourcePort] = {type:'arrow', dest:destID, port:destPort, label:label};
};


flowchart_visualization.prototype.render = function()
{
	var ctx = this.outputContext;
	ctx.font = this.texth + 'px monospace';
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	ctx.lineWidth = 2;
	
	// Black fill
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
	
	ctx.translate(this.outputCanvas.width / 2 - this.x, this.outputCanvas.height / 2 - this.y);
	
	for (var id in this.nodes)
	{
		this.nodes[id].update_bounds(ctx);
	}
	this._build_graph();
	for (var id in this.nodes)
	{
		this.nodes[id].drawfn(ctx);
	}
	
	ctx.font = this.texth/2 + 'px monospace';
	for (var id in this.nodes)
	{
		this._stroke_arrows(this.nodes[id]);
	}
	
	if (DEBUG && this.graph)
	{
		
		ctx.beginPath();
		ctx.strokeStyle = 'yellow';
		
		var graph = this.graph;
		/*
		// Draw edges
		for(var x = 0; x < graph.length - 0; x++)
		{
			for(var y = 0; y < graph[x].length - 0; y++)
			{
				if (graph[x][y].east.open)
				{
					ctx.moveTo(graph[x][y].x, graph[x][y].y);
					ctx.lineTo(graph[x+1][y].x, graph[x+1][y].y);
				}
				if (graph[x][y].south.open)
				{
					ctx.moveTo(graph[x][y].x, graph[x][y].y);
					ctx.lineTo(graph[x][y+1].x, graph[x][y+1].y);
				}
			}
		}
		ctx.stroke();
		*/
		
		// Draw vertices
		ctx.fillStyle = '#FF00FF';
		for(var x in graph)
			for(var y in graph[x])
			{
				ctx.beginPath();
				ctx.arc(graph[x][y].x, graph[x][y].y, 1, 0, 2 * Math.PI);
				ctx.fill();
			}
		
	}
		
	ctx.setTransform(1, 0, 0, 1, 0, 0);
};

flowchart_visualization.prototype._stroke_arrows = function(snode)
{
	var ctx = this.outputContext;
	ctx.strokeStyle = 'white';
	for(sdir in this.portkeys)
	{
		if (snode[sdir])
		{
			var p;	// Temporary variable for points
			var arrow = snode[sdir]
			var ddir = arrow.port;	// Destination direction
			var dnode = this.nodes[arrow.dest];	// Destination node
			var sport = snode.port_outer_coords(sdir);	// Source port coords
			var dport = dnode.port_outer_coords(ddir);	// Destination port coords
			var spos = this._coords_to_nearest_pos(sport.x, sport.y);	// Source port graph coords
			var dpos = this._coords_to_nearest_pos(dport.x, dport.y);	// Destination port graph coords
			
			//console.log("Pathing from " + spos.x + ", " + spos.y + " -> " + dpos.x + ", " + dpos.y + "\nSource: " + snode.text + " Dest: " + dnode.text);
			
			this._find_path(sdir, spos.x, spos.y, dpos.x, dpos.y, false);
			ctx.beginPath();
			p = dnode.port_inner_coords(ddir);
			ctx.moveTo(p.x, p.y);
			ctx.lineTo(dport.x, dport.y);
			// Traverse the path found by _find_path
			var cpos = dpos;
			//console.log(cpos);
			var cvertex = this._vertex(dpos);
			var b = 0;
			while(b < 100 && (cpos.x != spos.x || cpos.y != spos.y))
			{
				b++;
				cpos = this._neighbor(cpos, cvertex.from)
				cvertex = this._vertex(cpos);
				ctx.lineTo(cvertex.x, cvertex.y);
			}
			p = snode.port_inner_coords(sdir);
			ctx.lineTo(p.x, p.y);
			ctx.stroke();
			
			// Draw arrow head if required
			if (snode[sdir].type == 'arrow')
			{
				var arrowsize = 8;
				ctx.beginPath();
				p = dnode.port_inner_coords(ddir);
				var pleftx = p.x + {north:arrowsize, south:-arrowsize, east:arrowsize, west:-arrowsize}[ddir];
				var plefty = p.y + {north:-arrowsize, south:arrowsize, east:arrowsize, west:arrowsize}[ddir];
				var prightx = p.x + {north:-arrowsize, south:arrowsize, east:arrowsize, west:-arrowsize}[ddir];
				var prighty = p.y + {north:-arrowsize, south:arrowsize, east:-arrowsize, west:-arrowsize}[ddir];
				ctx.moveTo(pleftx, plefty);
				ctx.lineTo(p.x, p.y);
				ctx.lineTo(prightx, prighty);
				ctx.stroke();
			}
			// Draw arrow label
			if (snode[sdir].label)
			{
				ctx.fillStyle = 'white';
				ctx.fillText(snode[sdir].label, sport.x, sport.y);
			}
		}
	}
}

flowchart_visualization.prototype._coords_to_nearest_pos = function(x, y)
{
	var xindex = 0;
	var xmin = Infinity;
	for(var i = 0; i < this.graph.length; i++)
	{
		
		var dist = Math.abs(this.graph[i][0].x - x);
		if (dist < xmin)
		{
			xindex = i;
			xmin = dist;
			if (xmin == 0)
				break;
		}
	}
	var yindex = 0;
	var ymin = Infinity;
	for(var i = 0; i < this.graph[0].length; i++)
	{
		var dist = Math.abs(this.graph[0][i].y - y);
		if (dist < ymin)
		{
			yindex = i;
			ymin = dist;
			if (ymin == 0)
				break;
		}
	}
	return {x:xindex, y:yindex};
}

flowchart_visualization.prototype._build_graph = function()
{
	// Stuff all possible x and y coordinates into an array
	var x_array = [];
	var y_array = [];
	for (var id in this.nodes)
	{
		var n = this.nodes[id];
		x_array.push(n.oxmin);
		x_array.push(n.oxmax);
		y_array.push(n.oymin);
		y_array.push(n.oymax);

		// Insert port lines where needed
		for (var dir in this.portkeys)
		{
			if (n[dir])
			{
				var p = n.port_outer_coords(dir);
				x_array.push(p.x);
				y_array.push(p.y);
				
				var dest_node = this.nodes[n[dir].dest];
				p = dest_node.port_outer_coords(n[dir].port);
				x_array.push(p.x);
				y_array.push(p.y);
			}
		}
	}
	
	// Filter duplicates and sort
	var remove_duplicates = function(arr)
	{
		var seen = {};
		return arr.filter(function(i) { return seen.hasOwnProperty(i) ? false : (seen[i] = true); });
	}
	x_array = remove_duplicates(x_array).sort(function(a,b) { return a-b; });
	y_array = remove_duplicates(y_array).sort(function(a,b) { return a-b; });

	// Create the graph
	var graph = [];
	for(var x in x_array)
	{
		graph[x] = [];
		for(var y in y_array)
		{
			graph[x][y] = {
				x: x_array[x],
				y: y_array[y],
				north: {open:false},
				south: {open:false},
				east: {open:false},
				west: {open:false}
			};
		}
	}
	
	// Calculate edge weights
	for(var x = 0; x < x_array.length-1; x++)
	{
		for(var y in y_array)
		{
			var open = !this._edge_blocked(graph[x][y], graph[x+1][y]);
			var weight = graph[x+1][y].x - graph[x][y].x;
			graph[x][y].east.open = open;
			graph[x][y].east.weight = weight;
			graph[x+1][y].west.open = open;
			graph[x+1][y].west.weight = weight;
		}
	}
	
	for (var y = 0; y < y_array.length-1; y++)
	{
		for(var x in x_array)
		{
			var open = !this._edge_blocked(graph[x][y], graph[x][y+1]);
			var weight = graph[x][y+1].y - graph[x][y].y;
			graph[x][y].south.open = open;
			graph[x][y].south.weight = weight;
			graph[x][y+1].north.open = open;
			graph[x][y+1].north.weight = weight;
		}
	}

	this.graph = graph;	
}

flowchart_visualization.prototype._reset_graph = function()
{
	for(var x in this.graph)
	{
		var t = this.graph[x];
		for(var y in t)
		{
			t[y].dist = Infinity;
			t[y].turns = Infinity;
			t[y].count = 0;
		}
	}
}

flowchart_visualization.prototype._neighbor = function(pos, dir)
{
	var x = pos.x + {north:0, south:0, east:1, west:-1}[dir];
	var y = pos.y + {north:-1, south:1, east:0, west:0}[dir];
	return {x:x, y:y};
}

flowchart_visualization.prototype._vertex = function(pos)
{
	return this.graph[pos.x][pos.y];
}

flowchart_visualization.prototype._back = function(dir)
{
	return {north:'south', south:'north', east:'west', west:'east'}[dir];
}


flowchart_visualization.prototype._find_path = function(from, x1, y1, x2, y2, ignoreblocked)
{
	this._reset_graph();
	var graph = this.graph;
	var queue = [];
	
	graph[x1][y1].turns = 0;
	graph[x1][y1].dist = 0;
	graph[x1][y1].from = this._back(from);
	queue.push({x:x1, y:y1});
	
	while(queue.length != 0)
	{
		var pos = queue.shift();
		var current = this._vertex(pos);
		current.count += 1;
		//console.log(pos.x + ', ' + pos.y + ' = ' + current.count);
		for(var dir in this.portkeys)
		{
			//console.log(pos.x + ', ' + pos.y + ' -> ' + dir);
			if (current.from != dir && (current[dir].open || ignoreblocked))  // If we can move this way
			{
				var npos = this._neighbor(pos, dir);
				var n = this._vertex(npos);  // Get node on other side of edge
				// Calculate the cost of origin->current->n
				var turns = current.turns + (current.from == this._back(dir) ? 0 : 1);
				var dist = current.dist + current[dir].weight;
				if ((turns < n.turns) || (turns == n.turns && dist < n.dist))  // If we can reach n from current with a better cost
				{
					n.turns = turns;
					n.dist = dist;
					n.from = this._back(dir);
					queue.push(npos);
				}
			}
		}
	}
}



// Returns true if line segment AB is blocked by any node
flowchart_visualization.prototype._edge_blocked = function(A, B)
{
	// Source: http://bryceboe.com/2006/10/23/line-segment-intersection-algorithm/
	var ccw = function(A,B,C) { return (C.y-A.y) * (B.x-A.x) > (B.y-A.y) * (C.x-A.x); };
	var intersects = function(A,B,C,D) { return ccw(A,C,D) != ccw(B,C,D) && ccw(A,B,C) != ccw(A,B,D); };
	for (var id in this.nodes)
	{
		var n = this.nodes[id];
		// Check if AB is completely enclosed by this node
		if (A.x >= n.ixmin && B.x >= n.ixmin && A.y >= n.iymin && B.y >= n.iymin
			&& A.x <= n.ixmax && B.x <= n.ixmax && A.y <= n.iymax && B.y <= n.iymax)
			return true;
			
		// Check if AB intersects any of the four sides of this node
		var nw = {x:n.ixmin, y:n.iymin};
		var ne = {x:n.ixmax, y:n.iymin};
		var sw = {x:n.ixmin, y:n.iymax};
		var se = {x:n.ixmax, y:n.iymax};
		if (intersects(A,B,nw,ne) || intersects(A,B,ne,se) || intersects(A,B,se,sw) || intersects(A,B,sw,nw))
			return true;
	}
	return false;
}

function flowchart_node(type, text, x, y, texth)
{
	this.type = type;
	this.text = text;
	this.x = x;
	this.y = y;
	this.texth = texth;
	this.drawfn = function(ctx) { console.warn("flowchart_visualization: No drawfn set for this node."); }.bind(this);
}

flowchart_node.prototype.update_bounds = function(ctx)
{
	var radius = 25;
	var line_space = 25;
	var textw = ctx.measureText(this.text).width / 2;
	// Inner bounds
	this.ixmin = this.x - textw - radius;
	this.ixmax = this.x + textw + radius;
	this.iymin = this.y - radius;
	this.iymax = this.y + radius;
	
	// Outer bounds
	this.oxmin = this.ixmin - line_space;
	this.oxmax = this.ixmax + line_space;
	this.oymin = this.iymin - line_space;
	this.oymax = this.iymax + line_space;
	
	this.textw = textw;
}

flowchart_node.prototype.finish_draw = function(ctx)
{
	ctx.fillStyle = 'green';
	ctx.fill();
	ctx.strokeStyle = 'white';
	ctx.stroke();
	ctx.fillStyle = 'white';
	ctx.fillText(this.text, this.x - this.textw, this.y - this.texth / 2 - 2);
}

flowchart_node.prototype.port_inner_coords = function(port)
{
	var x = {north:this.x, south:this.x, east:this.ixmax, west:this.ixmin}[port];
	var y = {north:this.iymin, south:this.iymax, east:this.y, west:this.y}[port];
	return {x:x, y:y};
}

flowchart_node.prototype.port_outer_coords = function(port)
{
	var x = {north:this.x, south:this.x, east:this.oxmax, west:this.oxmin}[port];
	var y = {north:this.oymin, south:this.oymax, east:this.y, west:this.y}[port];
	return {x:x, y:y};
}
