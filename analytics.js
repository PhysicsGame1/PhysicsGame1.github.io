(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','http://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-74995888-1', 'auto');
  ga('send', 'pageview');

function send_analytics(){
	time_spent_on_level = Date.now() - time_spent_on_level;
	time_spent_on_array /= 1000;	//convert time to seconds
	time_spent_on_var	/= 1000;
	time_spent_on_cf /= 1000;
	time_spent_on_level /= 1000;
	console.log('time_spent_on_array '+time_spent_on_array);
	console.log('time_spent_on_var '+time_spent_on_var);
	console.log('time_spent_on_cf '+time_spent_on_cf);
	console.log('time_spent_on_level '+time_spent_on_level);
	console.log('balls used '+balls_used);
	ga('send', 'event', 'balls_used', {'eventCategory':'level_name'});
	ga('send', 'event', 'time_spent_on_array', {'eventCategory':'level_name'});
	ga('send', 'event', 'time_spent_on_var', {'eventCategory':'level_name'});
	ga('send', 'event', 'time_spent_on_cf', {'eventCategory':'level_name'});
	ga('send', 'event', 'time_spent_on_level', {'eventCategory':'level_name'});
        console.log("Sending Analytics");
	//reset analytics variables
	balls_used = 0;
	time_spent_on_array = 0;
	time_spent_on_var	= 0;
	time_spent_on_cf = 0;
	time_spent_on_level = Date.now();
}
