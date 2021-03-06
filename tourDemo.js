var CTPS = {};
CTPS.tourDemo = {};

CTPS.tourDemo.szServerRoot = 'http://appsrvr3.ad.ctps.org:8080/geoserver/'
CTPS.tourDemo.szWMSserverRoot = CTPS.tourDemo.szServerRoot + '/wms'; 
CTPS.tourDemo.szWFSserverRoot = CTPS.tourDemo.szServerRoot + '/wfs';

CTPS.tourDemo.TIMER_INTERVAL_MSEC = 10000; 

CTPS.tourDemo.bFirstTime = true;

// Global debug flag.
CTPS.tourDemo.bDebug = false;

CTPS.tourDemo.init = function() {
	function popup(url) {
		var popupWindow = window.open(url,'popUpWindow',
			'height=700,width=800,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes');
	};
	
	$('#blurb').hide();
	$('#about_button').click(function() { popup("tourDemoAbout.html"); });
	
	function makeTidGetter() {
		i = 0;
		return function() {
			var ix = i;
			i = (i < CTPSUTILS.aMpoTowns.length) ? i + 1 : 0;
			return CTPSUTILS.aMpoTowns[ix][0];
		}	
	}
	CTPS.tourDemo.getNextTid = makeTidGetter();
	
	var oBaseLayer = new ol.layer.Tile({ source: new ol.source.OSM() });
	
	var myStyle = new ol.style.Style({ fill	: new ol.style.Fill({ color: 'rgba(255,255,255,0.0)' }), 
									   stroke : new ol.style.Stroke({ color: '#ff0000', width: 3.0 })
									});
	
	CTPS.tourDemo.vectorSource = new ol.source.Vector({ wrapX: false });
	
	CTPS.tourDemo.vectorLayer = new ol.layer.Vector({ source: CTPS.tourDemo.vectorSource, style: myStyle });	

	CTPS.tourDemo.view = new ol.View({
		projection	: 'EPSG:900913',
		zoom		: 9				// established empirically
		// N.B. 'center' is set after MPO bound have been gotten.
	});
	
	CTPS.tourDemo.map = new ol.Map({
		target	: 'map',
		layers	: [oBaseLayer, CTPS.tourDemo.vectorLayer]
		// N.B. 'view' is set after view.center has been set.
	});
		
	var szServer = CTPS.tourDemo.szWFSserverRoot;
	var szTypename = 'ctps_pg:ctps_towns_mpo97_outline_poly';
	var szUrl = szServer + '?';
	szUrl += '&service=wfs';
	szUrl += '&version=1.0.0';
	szUrl += '&request=getfeature';
	szUrl += '&typename=' + szTypename;  // Native SRS of data is EPSG:26986
	szUrl += '&srsname=EPSG:900913';     // Re-project it to EPSG:900913 
	szUrl += '&outputformat=json';
	
	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {
								var reader = new ol.format.GeoJSON();
								var aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0 || aFeatures.length !== 1) {
									alert('Error: WFS request in CTPS.tourDemo.init returned ' + aFeatures.length +	' records.');
									return;
								} 
								var geometry = aFeatures[0].getGeometry();
								CTPS.tourDemo.oBoundsMpo = geometry.getExtent();						
								var aCenter = CTPS.tourDemo.boundsToCenter(CTPS.tourDemo.oBoundsMpo);
								CTPS.tourDemo.view.setCenter(aCenter);
								CTPS.tourDemo.map.setView(CTPS.tourDemo.view);
								CTPS.tourDemo.map.render();
								// Arm interval timer.
								CTPS.tourDemo.intervalID = window.setInterval(CTPS.tourDemo.timerFunc,  
								                                              CTPS.tourDemo.TIMER_INTERVAL_MSEC);
							},
			 error		: 	function (qXHR, textStatus, errorThrown) {
								alert('WFS request in CTPS.tourDemo.init failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}
			});
}; // CTPS.tourDemo.init()

CTPS.tourDemo.boundsToCenter = function(oExtent) {
	// The Open Layers extent 'object' is an array consisting of:  minx, miny, maxx, maxy.
	var x = oExtent[0] + ((oExtent[2] - oExtent[0]) / 2);
	var y = oExtent[1] + ((oExtent[3] - oExtent[1]) / 2);
	return [x,y];
	// console.log('center: x = ' + x + ', y = ' + y);
};	

// This function is called every CTPS.tourDemo.TIMER_INTERVAL_MSEC milliseconds, when the interval timer is armed.
// Move map to next town by: (1) zooming out a bit, and then (2) pan/zooming to the town.
CTPS.tourDemo.timerFunc = function() {
	function showTownInfo(props) {
		var aCommTypes = ['', 'Inner Core', 'Regional Urban Center', 'Maturing Suburb', 'Developing Suburb'];
		$('#town_name').html(props.town);
		$('#comm_type').html(aCommTypes[props.community_type]);
		$('#mapc_sub').html(props.mapc_sub);
		$('#rta').html(props.rta);
		$('#elec').html(props.elec);
		$('#gas').html(props.gas);
		$('#cable').html(props.cable);
		$('#pop_den').html(props.pop_density.toFixed(2) + ' people per square mile');
		$('#emp_den').html(props.emp_density.toFixed(2) + ' jobs per square mile');
		$('#elderly_pct').html(props.elderly_pop_pct.toFixed(2) + '%');
		$('#sidewalk_cov').html(props.sidewalk_cov_pct.toFixed(2) + '%');
		$('#sidewalk_mi').html(props.sidewalk_mi.toFixed(2));
		$('#ped_crash_rate').html(props.ped_crash_rate.toFixed(2) + ' crashes per 1,000 residents');
		$('#bike_trail_mi').html(props.bike_trail_mi.toFixed(2));
		$('#bike_lane_mi').html(props.bike_lane_mi.toFixed(2));
		$('#bike_crash_rate').html(props.bike_crash_rate.toFixed(2) + ' crashes per 1,000 residents');
		$('#autos_per_hh').html(props.autos_per_hh.toFixed(2));
		$('#vmt_per_hh').html(props.vmt_per_hh.toFixed(2));
		$('#drove_alone_share_pct').html(props.drove_alone_share_pct.toFixed(2) + '%');			
		$('#carpool_share_pct').html(props.carpool_share_pct.toFixed(2) + '%');			
		$('#transit_share_pct').html(props.transit_share_pct.toFixed(2) + '%');		
		$('#bike_share_pct').html(props.bike_share_pct.toFixed(2) + '%');
		$('#walk_share_pct').html(props.walk_share_pct.toFixed(2) + '%');
		$('#wah_share_pct').html(props.wah_share_pct.toFixed(2) + '%');
		$('#other_share_pct').html(props.other_share_pct.toFixed(2) + '%');
	}
	// Main function begins here.
	// Clear any feature(s) that might be in the vector layer.
	CTPS.tourDemo.vectorSource.clear();	
	var tid = CTPS.tourDemo.getNextTid();
	var szFilter = "town_id=" + tid;
	var szServer = CTPS.tourDemo.szWFSserverRoot;
	var szTypename = 'ctps_pg:ctps_towns_mapc_tour';  
	var szUrl = szServer + '?';
	szUrl += '&service=wfs';
	szUrl += '&version=1.0.0';
	szUrl += '&request=getfeature';
	szUrl += '&typename=' + szTypename;  // Native SRS of data is EPSG:26986
	szUrl += '&srsname=EPSG:900913';     // Re-project it to EPSG:900913 
	szUrl += '&outputformat=json';
	szUrl += '&cql_filter=' + szFilter;	

	$.ajax({ url		: szUrl,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var reader = new ol.format.GeoJSON();
								var aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0 || aFeatures.length !== 1) {
									alert('Error: WFS request in CTPS.tourDemo.timerFunc returned ' + aFeatures.length + ' records.');
									return;
								} 
								var props = aFeatures[0].getProperties();								
								// $('#debug_div').html('Showing ' + props.TOWN);
								var geometry = aFeatures[0].getGeometry();
								var oBoundsTown = geometry.getExtent();	
								var aCenter = CTPS.tourDemo.boundsToCenter(oBoundsTown);
								// Set up animation.
								var duration = 3000;
								var start = +new Date();
								var pan, zoom, bounce;
								if (CTPS.tourDemo.bFirstTime === true) {
									$('#blurb').show();
									pan = ol.animation.pan({ duration	: duration,
															 source 	: CTPS.tourDemo.view.getCenter(),
															 start		: start	
														   });
									zoom = ol.animation.zoom({ duration		: duration,
															   resolution 	: CTPS.tourDemo.view.getResolution(),
															   start		: start 
															  });
									CTPS.tourDemo.map.beforeRender(pan, zoom);
									CTPS.tourDemo.view.setCenter(aCenter);
									CTPS.tourDemo.view.setResolution(38);
									CTPS.tourDemo.bFirstTime = false;
								} else {
									pan = ol.animation.pan({ duration	: duration,
															 source 	: CTPS.tourDemo.view.getCenter(),
															 start		: start	
														   });
									bounce = ol.animation.bounce({ duration		: duration,
																   resolution	: CTPS.tourDemo.view.getResolution() * 2,
																   start        : start 
																});
									CTPS.tourDemo.map.beforeRender(pan, bounce);
									CTPS.tourDemo.view.setZoom(12);
									CTPS.tourDemo.view.setCenter(aCenter);
								}
								// Add feature to vector layer.
								var newFeature = new ol.Feature(geometry);
								CTPS.tourDemo.vectorSource.addFeature(newFeature);
								showTownInfo(props);
							},
			 error		: 	function (qXHR, textStatus, errorThrown ) {
								alert('WFS request in CTPS.tourDemo.timerFunc failed.\n' +
										'Status: ' + textStatus + '\n' +
										'Error:  ' + errorThrown);
							}
			});		
}; // CTPS.tourDemo.timerFunc()

// Kill switch - for use during debugging.
CTPS.tourDemo.stopPolling = function() {
	window.clearInterval(CTPS.tourDemo.intervalID);
}; // CTPS.tourDemo.stopPolling()