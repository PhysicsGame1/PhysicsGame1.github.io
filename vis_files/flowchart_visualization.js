/**********************************************************************************************************************
  Data Structure of flowchart_visualization
 **********************************************************************************************************************
  Key                           Type          Meaning
    .dirty                      Boolean       True if the edge graph needs to be recalculated
    .portkeys                   Object        Keys in this are available port names.
    .snap                       Boolean       True if nodes should be snapped to the nearest vertex position
    .spread                     Integer       Distance between vertices in edge graph
    .texth                      Integer       Font size in pixels
    .x                          Float         x position of the camera
    .y                          Float         y position of the camera

    .outputCanvas               HTMLElement   The canvas to render on          
    .outputContext              --            2d canvas context
    
    .nodes[ID]
      .type                     String        Node type: 'terminal', 'io', 'decision', 'process'
      .text                     String        Text to be drawn in this node
      .x                        Float         x coordinate of the center of this node
      .y                        Float         y coordinate of the center of this node
      .highlight                Boolean       True if this node should be drawn in a different color
 **********************************************************************************************************************
  Notes:
  Functions beginning with _ underscore are for internal use.
  
  Essentially this visualization allows easy specification of various types of nodes ('terminal', 'decision', etc)
  and arrows linking between them. Currently, each node has 4 ports, where an arrow can enter or leave that node.
  The ports are centered on the north, south, east, and west bounds of the node. The visualization allows multiple
  arrows to enter a port, but only one arrow may exit a port.
  
  var fvis = new flowchart_visualization();
  fvis.setCanvas(canvas_element);
  
  fvis.terminal('START', 'start', 0, 0);  // Create a terminal at (0, 0) with ID 'START' and the text 'start' written inside
  fvis.process('STEP1', 'step 1', 0, 100);
  fvis.terminal('END', 'end', 100, 100);
  
  fvis.arrow('START', 'south', 'STEP1', 'north');  // Create an arrow from the south port of START to the north port of STEP1
  fvis.arrow('STEP1', 'east', 'END', 'west');
  
  fvis.render();
  
  The output will be something like:
  
   ( start )
       |
       V
   | step 1 | -> ( end )
  
  
  Note that nodes require coordinates to be specified, but arrows do not. Paths for arrows are dynamically generated
  when the visualization renders. 
  
  Performance notes:
  Arrow pathfinding can be an expensive process if there are many arrows defined. A grid form graph is created spanning
  the region around all of the nodes in the visualization. This is used to find paths between node ports for arrows to follow.
  
  The .spread variable determines the distance between possible vertices in the edge graph when calculating arrow paths. A higher value
  for spread will improve performance, but may not look as good, or may not provide enough vertices for all of the arrows to find a path.

  If the .snap variable is set to true, it prevents arrows having diagonal edges by forcing nodes to be at x,y coordinates that are in line
  with the grid created by the arrow pathfinding graph. If set to false, the nodes will not be moved, but arrows may appear with diagonal edges.
  
  The .dirty variable should be set to true after any action that would cause an arrow to move. Arrow paths are cached after the first render
  call. Setting this variable informs the visualization that it needs to recalculate arrow paths on the next render call.  
 ***********************************************************************************************************************/

function flowchart_visualization()
{
  this.texth = 18;
  this.spread = 10;
  this.dirty = false;
  this.snap = true;
  this.portkeys = {east:true, north:true, south:true, west:true};
  this.reset();
}

/************************************************************
 * Function: setCanvas
 * Parameters: 
 *    canvas - HTMLElement
 * What it does: 
 *    Sets the canvas the visualization renders to.
 * Return value: None
 ************************************************************/
flowchart_visualization.prototype.setCanvas = function (canvas)
{
    this.outputCanvas = canvas;
    this.outputContext = canvas.getContext('2d');
};

/************************************************************
 * Function: reset
 * What it does: 
 *    Resets the internal state of the visualization.
 *    Does not affect anything related to rendering.
 * Return value: None
 ************************************************************/
flowchart_visualization.prototype.reset = function()
{
  this.nodes = {};
  this.x = 0;
  this.y = 0;
};

/************************************************************
 * Function: center_on
 * Parameters: 
 *    id - ID of a node
 * What it does: 
 *    Sets the camera to look down on a node given by ID
 * Return value: None
 ************************************************************/
flowchart_visualization.prototype.center_on = function(id)
{
  if (typeof this.nodes[id] != 'undefined')
  {
    this.x = this.nodes[id].x;
    this.y = this.nodes[id].y;
  }
};

/************************************************************
 * Function: get_by_id
 * Parameters: 
 *    id - ID of a node
 * What it does: 
 *    Returns the node given by ID
 * Return value: flowchart_node
 ************************************************************/
flowchart_visualization.prototype.get_by_id = function(id)
{
  return this.nodes[id];
};

/************************************************************
 * Function: highlight
 * Parameters: 
 *    id - ID of a node
 * What it does: 
 *    Highlights the node given by ID. All other nodes have
 *    their highlighting removed.
 * Return value: None
 ************************************************************/
flowchart_visualization.prototype.highlight = function(id)
{
  for(var i in this.nodes)
    this.nodes[i].highlight = false;
  if (this.nodes[id])
    this.nodes[id].highlight = true;
};

/************************************************************
 * Function: node_under_mouse
 * Parameters: 
 *    mouseX - x coordinate of mouse relative to outputCanvas
 *    mouseY - y coordinate of mouse relative to outputCanvas
 * What it does: 
 *    Returns the node under the mouse, or null if no node
 *    is under the mouse.
 * Return value: flowchart_node
 ************************************************************/
flowchart_visualization.prototype.node_under_mouse = function(mouseX, mouseY)
{
  var x_world = mouseX - this.outputCanvas.width / 2 + this.x;
  var y_world = mouseY - this.outputCanvas.height / 2 + this.y;
  for(var id in this.nodes)
  {
    var n = this.nodes[id];
    if (x_world >= n.ixmin && x_world <= n.ixmax && y_world >= n.iymin && y_world <= n.iymax)
      return n;
  }
  return null;
};

/************************************************************
 * Function: id_under_mouse
 * Parameters: 
 *    mouseX - x coordinate of mouse relative to outputCanvas
 *    mouseY - y coordinate of mouse relative to outputCanvas
 * What it does: 
 *    Returns the ID of the node under the mouse, or an empty
 *    string if no node is under the mouse.
 * Return value: String ID
 ************************************************************/
flowchart_visualization.prototype.id_under_mouse = function(mouseX, mouseY)
{
  var x_world = mouseX - this.outputCanvas.width / 2 + this.x;
  var y_world = mouseY - this.outputCanvas.height / 2 + this.y;
  for(var id in this.nodes)
  {
    var n = this.nodes[id];
    if (x_world >= n.ixmin && x_world <= n.ixmax && y_world >= n.iymin && y_world <= n.iymax)
      return id;
  }
  return '';
};

/************************************************************
 * Function: terminal
 * Parameters: 
 *    id - A unique string identifier
 *    text - String to be written in the node when rendering
 *    x - x coordinate of this node
 *    y - y coordinate of this node
 * What it does: 
 *    Creates a new node in the shape of an oval.
 * Return value: None
 ************************************************************/
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
  this.dirty = true;
  return this.nodes[id];
};

/************************************************************
 * Function: decision
 * Parameters: 
 *    id - A unique string identifier
 *    text - String to be written in the node when rendering
 *    x - x coordinate of this node
 *    y - y coordinate of this node
 * What it does: 
 *    Creates a new node in the shape of a diamond.
 * Return value: None
 ************************************************************/
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
  this.dirty = true;
  return this.nodes[id];
};

/************************************************************
 * Function: io
 * Parameters: 
 *    id - A unique string identifier
 *    text - String to be written in the node when rendering
 *    x - x coordinate of this node
 *    y - y coordinate of this node
 * What it does: 
 *    Creates a new node in the shape of a parallelogram.
 * Return value: None
 ************************************************************/
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
  this.dirty = true;
  return this.nodes[id];
};

/************************************************************
 * Function: process
 * Parameters: 
 *    id - A unique string identifier
 *    text - String to be written in the node when rendering
 *    x - x coordinate of this node
 *    y - y coordinate of this node
 * What it does: 
 *    Creates a new node in the shape of a rectangle.
 * Return value: None
 ************************************************************/
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
  this.dirty = true;
  return this.nodes[id];
};

/************************************************************
 * Function: arrow
 * Parameters: 
 *    sourceID - ID of the source node
 *    sourcePort - String name of the port on the source node
 *    destID - ID of the destination node
 *    destPort - String name of the port on the destination node
 *    label - Optional text that should be written near the source port
 * What it does: 
 *    Adds an arrow from one node's port to another node's port.
 *    Note that both nodes identified by sourceID and destID should
 *    be created before trying to create an arrow between them.
 * Return value: None
 ************************************************************/
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
  this.dirty = true;
  this.nodes[sourceID][sourcePort] = {type:'arrow', dest:destID, port:destPort, label:label};
};

/************************************************************
 * Function: render
 * What it does: 
 *    Renders the visualization on the selected canvas.
 * Return value: None
 ************************************************************/
flowchart_visualization.prototype.render = function()
{
  var ctx = this.outputContext;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.lineWidth = 2;
  
  // Black fill
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
  
  ctx.translate(this.outputCanvas.width / 2 - this.x, this.outputCanvas.height / 2 - this.y);
  
  var id;
  if (this.dirty && this.snap)
  { // Snap nodes to grid
    for (id in this.nodes)
    {
      this.nodes[id].x = Math.round(this.nodes[id].x / this.spread) * this.spread;
      this.nodes[id].y = Math.round(this.nodes[id].y / this.spread) * this.spread;
    }
  }
  ctx.font = this.texth + 'px monospace';
  for (id in this.nodes)
  {
    this.nodes[id].update_bounds(ctx);
  }
  if (this.dirty) // Something has changed such that we need to recalculate arrow paths
  {
    this._build_graph();
    for (id in this.nodes)
    {
      var node = this.nodes[id];
      for(var dir in this.portkeys)
        if (node[dir])
          this._find_path(node, dir);
    }
    this.dirty = false;
  }

  /* Draws graph vertices and open paths
  if (DEBUG && this.graph)
  {
    var x, y;
    ctx.beginPath();
    ctx.strokeStyle = '#333333';
    
    var graph = this.graph;
    
    // Draw edges
    for(x = 0; x < graph.length - 0; x++)
    {
      for(y = 0; y < graph[x].length - 0; y++)
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
    
    // Draw vertices
    ctx.fillStyle = '#FF00FF';
    for(x in graph)
      for(y in graph[x])
      {
        ctx.beginPath();
        ctx.arc(graph[x][y].x, graph[x][y].y, 1, 0, 2 * Math.PI);
        ctx.fill();
      }
    
  }
  */
  
  ctx.font = this.texth + 'px monospace';
  for (id in this.nodes)
  { 
    this.nodes[id].drawfn(ctx);
  }
  
  ctx.font = this.texth/2 + 'px monospace';
  for (id in this.nodes)
  {
    this._stroke_arrows(this.nodes[id]);
  }
    
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

/************************************************************
 *            Internal Functions
 ************************************************************/
flowchart_visualization.prototype._stroke_arrows = function(snode)
{
  var ctx = this.outputContext;
  ctx.strokeStyle = 'white';
  for(var sdir in this.portkeys)
  {
    if (snode[sdir])
    {
      var path = snode[sdir].path;
      ctx.beginPath();
      ctx.strokeStyle = snode.highlight ? '#00CC00' : 'white';
      ctx.strokeStyle = snode[sdir].success ? ctx.strokeStyle : 'red';
      ctx.moveTo(path[0].x, path[0].y);
      for(var i = 1; i < path.length; i++)
        ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
      
      // Draw arrow head if required
      if (snode[sdir].type == 'arrow')
      {
        var arrowsize = 8;
        var arrow = snode[sdir];
        var ddir = arrow.port;
        var p = this.nodes[arrow.dest].port_inner_coords(ddir);
        var pleftx = p.x + {north:arrowsize, south:-arrowsize, east:arrowsize, west:-arrowsize}[ddir];
        var plefty = p.y + {north:-arrowsize, south:arrowsize, east:arrowsize, west:arrowsize}[ddir];
        var prightx = p.x + {north:-arrowsize, south:arrowsize, east:arrowsize, west:-arrowsize}[ddir];
        var prighty = p.y + {north:-arrowsize, south:arrowsize, east:-arrowsize, west:-arrowsize}[ddir];
        ctx.beginPath();
        ctx.moveTo(pleftx, plefty);
        ctx.lineTo(p.x, p.y);
        ctx.lineTo(prightx, prighty);
        ctx.stroke();
      }
      // Draw arrow label
      if (snode[sdir].label)
      {
        ctx.fillStyle = 'white';
        var sport = snode.port_outer_coords(sdir);
        ctx.fillText(snode[sdir].label, sport.x, sport.y);
      }
    }
  }
};

flowchart_visualization.prototype._coords_to_nearest_graphpos = function(x, y)
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
  for(i = 0; i < this.graph[0].length; i++)
  {
    dist = Math.abs(this.graph[0][i].y - y);
    if (dist < ymin)
    {
      yindex = i;
      ymin = dist;
      if (ymin == 0)
        break;
    }
  }
  return {x:xindex, y:yindex};
};

flowchart_visualization.prototype._build_graph = function()
{
  var x_array = [];
  var y_array = [];
  var xmin = Infinity;
  var xmax = -Infinity;
  var ymin = Infinity;
  var ymax = -Infinity;
  // Find min and max coordinates in each direction
  for (var id in this.nodes)
  {
    var n = this.nodes[id];
    xmin = Math.min(xmin, n.oxmin);
    xmax = Math.max(xmax, n.oxmax);
    ymin = Math.min(ymin, n.oymin);
    ymax = Math.max(ymax, n.oymax);
  }
  
  var spread = this.spread;
  // Snap to values divisible by spread
  xmin = Math.round(xmin / spread) * spread - 5*spread;
  xmax = Math.round(xmax / spread) * spread + 5*spread;
  ymin = Math.round(ymin / spread) * spread - 5*spread;
  ymax = Math.round(ymax / spread) * spread + 5*spread;
  for(var i = xmin; i <= xmax; i+=spread)
    x_array.push(i);
  for(i = ymin; i <= ymax; i+=spread)
    y_array.push(i);
  
  // Filter duplicates and sort
  var remove_duplicates = function(arr)
  {
    var seen = {};
    return arr.filter(function(k) { return seen.hasOwnProperty(k) ? false : (seen[k] = true); });
  };
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
        // open = not blocked by a node
        // weight = distance to the next node
        // free = not used by another path
        north: {open:false, weight:Infinity, free:true},
        south: {open:false, weight:Infinity, free:true},
        east: {open:false, weight:Infinity, free:true},
        west: {open:false, weight:Infinity, free:true},
        dist: Infinity,
        turns: Infinity
      };
    }
  }
  
  // Calculate edge weights
  for(x = 0; x < x_array.length-1; x++)
  {
    for(y in y_array)
    {
      var open = !this._edge_blocked(graph[x][y], graph[x+1][y]);
      graph[x][y].east.open = open;
      graph[x][y].east.weight = this.spread;
      graph[x+1][y].west.open = open;
      graph[x+1][y].west.weight = this.spread;
    }
  }
  
  for (y = 0; y < y_array.length-1; y++)
  {
    for(x in x_array)
    {
      open = !this._edge_blocked(graph[x][y], graph[x][y+1]);
      graph[x][y].south.open = open;
      graph[x][y].south.weight = this.spread;
      graph[x][y+1].north.open = open;
      graph[x][y+1].north.weight = this.spread;
    }
  }

  this.graph = graph; 
};

flowchart_visualization.prototype._reset_graph = function()
{
  for(var x in this.graph)
  {
    var t = this.graph[x];
    for(var y in t)
    {
      t[y].dist = Infinity;
      t[y].turns = Infinity;
    }
  }
};

flowchart_visualization.prototype._find_path = function(srcNode, srcDir, ignoreBlocked)
{
  // Faster queue implementation to help performance
  // fqueue.shift is constant time, while native array.shift is linear
  var fqueue = function()
  {
    this.index = 0;
    this.array = [];
  };

  fqueue.prototype.push = function(i)
  {
    this.array.push(i);
  };

  fqueue.prototype.shift = function()
  {
    return this.array[this.index++];
  };

  fqueue.prototype.empty = function()
  {
    return this.index==this.array.length;
  };
  
  // Returns the graph position of the neighbor of vertex at pos in the direction dir
  var neighbor = function(pos, dir)
  {
    var x = pos.x + {north:0, south:0, east:1, west:-1}[dir];
    var y = pos.y + {north:-1, south:1, east:0, west:0}[dir];
    return {x:x, y:y};
  };
  
  // Returns the opposite of dir
  var back = {north:'south', south:'north', east:'west', west:'east'};
  
  ignoreBlocked = (typeof ignoreBlocked === 'undefined') ? false : ignoreBlocked;
    
  this._reset_graph();
  var graph = this.graph;

  var srcCoords = srcNode.port_outer_coords(srcDir);
  var srcGraphPos = this._coords_to_nearest_graphpos(srcCoords.x, srcCoords.y);
 
  var dstFound = false;
  var dstDir = srcNode[srcDir].port;
  var dstNode = this.get_by_id(srcNode[srcDir].dest);
  var dstCoords = dstNode.port_outer_coords(dstDir);
  var dstGraphPos = this._coords_to_nearest_graphpos(dstCoords.x, dstCoords.y);

  var pos = srcGraphPos;
  var vertex = graph[pos.x][pos.y];
  vertex.turns = 0;
  vertex.dist = 0;
  vertex.from = back[srcDir];
  vertex.longestLeg = 0;
  vertex.currentLeg = 0;
  
  var queue = new fqueue();
  queue.push(pos);
  
  // Find shortest paths
  while(!queue.empty())
  {
    pos = queue.shift();
    vertex = graph[pos.x][pos.y];
    
    for(var dir in this.portkeys)
    {
      //console.log(pos.x + ', ' + pos.y + ' -> ' + dir);
      if (vertex.from != dir                      // If we are not going back the way we came
          && (vertex[dir].open || ignoreBlocked)  // and this edge is not blocked
          && (vertex[dir].free || ignoreBlocked)) // and this edge is not already used
      {
        var npos = neighbor(pos, dir);
        var nvertex = graph[npos.x][npos.y];  // Get node on other side of edge
        
        // Calculate the costs of src->vertex->nvertex
        var turns = vertex.turns + (vertex.from == back[dir] ? 0 : 1);
        var dist = vertex.dist + vertex[dir].weight;
        
        if ((turns < nvertex.turns)                              // Prioritize least number of turns
            || (turns == nvertex.turns && dist < nvertex.dist))   // and then lowest distance
        {
          if (npos.x == dstGraphPos.x && npos.y == dstGraphPos.y)
          {
            if (dir == dstDir)
              continue;
            dstFound = true;
          }
          nvertex.turns = turns;
          nvertex.dist = dist;
          nvertex.from = back[dir];
          queue.push(npos);
        }
      }
    }
  }
  
  // Reconstruct the path of interest and mark it
  var path = [dstNode.port_inner_coords(dstDir)];
  // If we found a path and src != dst
  if (dstFound && (dstGraphPos.x != srcGraphPos.x || dstGraphPos.y != srcGraphPos.y))
  {
    // Retrace steps from dst to src
    pos = dstGraphPos;
    while(pos.x != srcGraphPos.x || pos.y != srcGraphPos.y)
    {
      vertex = graph[pos.x][pos.y];
      vertex[vertex.from].free = false;
      path.push({x:vertex.x, y:vertex.y});
      pos = neighbor(pos, vertex.from);
      nvertex = graph[pos.x][pos.y];
      nvertex[back[vertex.from]].free = false;
    }
    path.push({x:nvertex.x, y:nvertex.y});
  }
  else
  {
    path.push(dstCoords);
    path.push(srcCoords);
  }
  path.push(srcNode.port_inner_coords(srcDir));
  // Cache the results
  srcNode[srcDir].success = dstFound || (dstGraphPos.x == srcGraphPos.x && dstGraphPos.y == srcGraphPos.y);
  srcNode[srcDir].path = path;
};


// Returns true if line segment AB is blocked by any node
// Optimization: Assumes point A is either to the left or above B
flowchart_visualization.prototype._edge_blocked = function(A, B)
{
  for (var id in this.nodes)
  {
    var n = this.nodes[id];
    var xmin = n.ixmin - 3;
    var xmax = n.ixmax + 3;
    var ymin = n.iymin - 3;
    var ymax = n.iymax + 3;
    var inside_x = (A.x >= xmin && B.x <= xmax);
    if (inside_x)
    {
      if (A.y < ymin && B.y > ymin) // Top edge
        return true;
      if (A.y < ymax && B.y > ymax) // Bottom edge
        return true;
      
    }
    var inside_y = (A.y >= ymin && B.y <= ymax);
    if (inside_y)
    {
      if (A.x < xmin && B.x > xmin) // Left edge
        return true;
      if (A.x < xmax && B.x > xmax) // Right edge
        return true;
    }
    if (inside_x && inside_y)
      return true;
  }
  return false;
};

// flowchart_node is considered to be internal, none of the functions defined are to be called externally
function flowchart_node(type, text, x, y, texth)
{
  this.type = type;
  this.text = text;
  this.x = x;
  this.y = y;
  this.texth = texth;
  this.drawfn = function(ctx) { console.warn("flowchart_visualization: No drawfn set for this node."); }.bind(this);
  this.highlight = false;
}

flowchart_node.prototype.update_bounds = function(ctx)
{
  var radius = 25;
  var line_space = 16;
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
};

flowchart_node.prototype.finish_draw = function(ctx)
{
  ctx.fillStyle = this.highlight ? '#009900' :'#004400';
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.stroke();
  ctx.fillStyle = 'white';
  ctx.fillText(this.text, this.x - this.textw, this.y - this.texth / 2 - 2);
};

flowchart_node.prototype.port_inner_coords = function(port)
{
  var x = {north:this.x, south:this.x, east:this.ixmax, west:this.ixmin}[port];
  var y = {north:this.iymin, south:this.iymax, east:this.y, west:this.y}[port];
  return {x:x, y:y};
};

flowchart_node.prototype.port_outer_coords = function(port)
{
  var x = {north:this.x, south:this.x, east:this.oxmax, west:this.oxmin}[port];
  var y = {north:this.oymin, south:this.oymax, east:this.y, west:this.y}[port];
  return {x:x, y:y};
};