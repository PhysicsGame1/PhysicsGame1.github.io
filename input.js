var current_tab = "array";


  function linkToGame(){
    window.location.assign('/');
  }
  //visualization selection
  $(".vis_tab").click(function(){
    if($(this).attr("id") == "a_tab"){
      $("#a_tab").css({"background-color":"#aaa"});     //make a_tab selected color
      $("#v_tab").css({"background-color":"#f0f0f0"});  //make other tabs original color
      $("#cf_tab").css({"background-color":"#f0f0f0"}); 
      updateVisTime("array");
    }else if($(this).attr("id") == "v_tab"){
      $("#v_tab").css({"background-color":"#aaa"});     //make v_tab selected color
      $("#a_tab").css({"background-color":"#f0f0f0"});  //make other tabs original color
      $("#cf_tab").css({"background-color":"#f0f0f0"});
      updateVisTime("var");
    }else if($(this).attr("id") == "cf_tab"){
      $("#cf_tab").css({"background-color":"#aaa"});    //make cf_tab selected color
      $("#a_tab").css({"background-color":"#f0f0f0"});  //make other tabs original color
      $("#v_tab").css({"background-color":"#f0f0f0"});  
      updateVisTime("cf");
    }
  });

  function updateVisTime(visualization){
    var time_now = Date.now();
    if(current_tab == "array"){
      time_spent_on_array += time_now - time_vis_switch;
    }else if(current_tab == "var"){
      time_spent_on_var += time_now - time_vis_switch;
    }else if(current_tab == "cf"){
      time_spent_on_cf += time_now - time_vis_switch;
    }
    current_tab = visualization;
    time_vis_switch = time_now;
  }

  $(".nav").children("ul").mouseover(function(){
    $(this).parent().children("a").css({"background-color":"#006600"});
  }).mouseout(function(){
    $(this).parent().children("a").css({"background-color":"#009900"});
  });
