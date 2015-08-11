/*
** Copyright 2014 Google Inc.
**
** Licensed under the Apache License, Version 2.0 (the "License");
** you may not use this file except in compliance with the License.
** You may obtain a copy of the License at
**
**    http://www.apache.org/licenses/LICENSE-2.0
**
** Unless required by applicable law or agreed to in writing, software
** distributed under the License is distributed on an "AS IS" BASIS,
** WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
** See the License for the specific language governing permissions and
** limitations under the License.
*/
requirejs.config({
  paths: {
  	'baidumaps': '/js/baidumaps',
    'tencentmaps': '/js/tencentmaps',
	'googlemaps': '/js/googlemaps',
	'BmapLib':'/js/EventWrapper',
	'config': '/js/config',
	'jquery': '/js/lib/jquery/jquery-2.0.3.min',
    'jquery-private': '/js/jquery-private'
  },
  shim: {
    'config': { exports: 'config' },
    'tencentmaps': {
     deps: [
		'async!http://map.qq.com/api/js?v=2.exp&libraries=geometry&key=S5PBZ-MX53W-2AHRY-R7Y5S-WTCW6-OLFRF&sensor=false!callback'
		]
    },
	'baidumaps': {
      deps: [
       'async!http://api.map.baidu.com/api?v=2.0&ak=NkArbcs6kW74wrlpZcTNHU2g&sensor=false!callback'
      ]
	},
	
	'googlemaps': {
      deps: [
        'async!http://maps.googleapis.com/maps/api/js?v=3.exp&libraries=geometry&sensor=false!callback'
      ]
    }
  },
  map: {
    '*': { 'jquery': 'jquery-private' },
    'jquery-private': { 'jquery': 'jquery' }
  }
});

define(['baidumaps','tencentmaps','googlemaps','BmapLib','config','jquery'], function(BMaps,QMaps,GMaps,BmapLib,config,$) {
   var apiProvider = config.provider;    
   var tencentKey = config.tencentKey;
   var baiduKey = config.baiduKey;
   var StreetViewStatus = {
	OK: GMaps.StreetViewStatus.OK,
   };
   
   function SetProvider(app) {
	var providerID;
	if(app == 'google')
		providerID = 1;
	else if(app == 'tencent')
		providerID = 2;
	else if(app == 'baidu')
		providerID = 3;
	else providerID = 1;
	
    apiProvider = providerID;
   }
   
   //base class
   function LatLng(lat,lng)
   {
     var loc;
	 if(apiProvider==1){
	    loc = new GMaps.LatLng(lat,lng);
		loc.lat = loc.lat;
		loc.lng = loc.lng;
		}
	 else if(apiProvider==2) 
		loc = new QMaps.LatLng(lat,lng);
	 else if(apiProvider==3) 
		loc = new BMaps.Point(lng,lat);
		
	 return loc;
   }
   
   function Point(x,y)
   {
     var point;
	 if(apiProvider==1)
		point = new GMaps.Point(x,y);
	 else if(apiProvider==2) 
		point = new QMaps.Point(x,y);
	 else if(apiProvider==3) 
		point = new BMaps.Pixel(x,y);
	 return point;
   }
   
   function Size(width,height)
   {
     var size;
	 
	 if(apiProvider==1)
		size = new GMaps.Size(width,height);
	 else if(apiProvider==2) 
		size = new QMaps.Size(width,height);
	 else if(apiProvider==3) 
		size = new BMaps.Size(width,height);
	 return size;
   }
   

    // street view service
	function PanoSvFrom() {
	  var sv;
	  switch(apiProvider)
	  {
	  case 1:
		sv = GMaps.StreetViewService;
	    break;
	  case 2:		
		sv = QMaps.PanoramaService;
	    break;
	  case 3:
		sv = BMaps.PanoramaService; 
		break;
	  }	  
	  return sv;
   }
   
   function StreetViewService(){
		PanoSvFrom.apply(this);
	
		this.getPanoramaById = getPanoramaById;
		this.getPanoramaByLocation = getPanoramaByLocation;
   }
  
   getPanoramaById = function(panoid,cb)
   {
	  switch(apiProvider)
	  {
	  case 1:
	    var sv_svc = new GMaps.StreetViewService();
		sv_svc.getPanoramaById(panoid,cb);
	    break;
		
	  case 2:	
	    var data = null;
		console.log(panoid);
	    if (panoid.match(/^\w+$/))
	    {		
		$.getJSON("http://apis.map.qq.com/ws/streetview/v1/getpano?id="+panoid+"&radius=100&key="+tencentKey+"&output=jsonp&callback=?",
	      function(ret) {
		  console.log(ret.status);
		  if(ret.status == 0)
		  {
			data = {
				location: {pano:ret.detail.id,latLng: new QMaps.LatLng(ret.detail.location.lat,ret.detail.location.lng),description:ret.detail.description}
			};
		    cb(data,StreetViewStatus.OK);
		  }	 
	     });	
	    }
	    break;
		
	  case 3:
		data = null;
		console.log("apiProvider 3");
		var sv_svc = new BMaps.PanoramaService();
		sv_svc.getPanoramaById(panoid,
			function(ret){
			if (ret == null) {  
				return;  
			} 
			data = {
				location: {pano:ret.id,latLng:ret.position,description:ret.description},
				links:ret.links,
				tiles:ret.tiles
			};
			console.log(panoid);	
			console.log(ret.position);
			console.log(ret.id);
			cb(data,StreetViewStatus.OK);	
		});		
		break;
	  }
   };
   
	getPanoramaByLocation = function(position, radius, cb)  
   {
	  switch(apiProvider)
	  {
	  case 1:
	    var sv_svc = new GMaps.StreetViewService();
		sv_svc.getPanoramaByLocation(position,radius,cb);
	    break;
		
	  case 2:	
	    var sv_svc = new QMaps.PanoramaService();
		sv_svc.getPano(position,radius,function(ret) {
		  if(ret !== 0){
			data = {
				location: {pano:ret.id,latLng:ret.latlng,description:ret.description}
			};
		    cb(data,StreetViewStatus.OK);
		  }	 
	     });
		break;
		
	  case 3:
	    var sv_svc = new BMaps.PanoramaService();
		sv_svc.getPanoramaByLocation(position,radius,function(ret){
			if (ret == null) {  
				return;  
			} 
			data = {
				location: {pano:ret.id,latLng:ret.position,description:ret.description},
				links:ret.links,
				tiles:ret.tiles
			};
					
			console.log(ret.position);
			console.log(ret.id);
			cb(data,StreetViewStatus.OK);	
		});		
		break;
	  }
   };
   

   
  
   //Map Module
/*    function WhilchMap()
   {
    var map;
	switch(apiProvider){
	 case 1:
		map = GMaps.Map
		break;
	 case 2:
		map = QMaps.Map; 
		break;
	 case 3:
		map = BMaps.Map;
		break;
	 }
	  return map;
   }
   
   function Map(div,opt)
   {
      WhilchMap.apply(this,arguments);
	  this.addOverlay = function(overlay){};
	  this.setStreetView = function(streetview){};
	  this.setOptions;
   } */
      
   function Map(div,opt)
   {
      var map;
	  switch(apiProvider)
	{
	 case 1:
		map = new GMaps.Map(div,opt);
		map.addOverlay = function(overlay){};
		break;
	 case 2:
		map = new QMaps.Map(div,opt); 
		map.addOverlay = function(overlay){};
		map.setStreetView = function(streetview){};
		break;
	 case 3:
		map = new BMaps.Map(div,opt);	
		map.setStreetView = map.setPanorama;
		map.setOptions = function(opt){
			map.setZoom(opt.zoom);
			map.setCenter(opt.center)
			if(opt.mapTypeControl){
				map.enableScrollWheelZoom();
			}
		};
		map.setStreetView = map.setPanorama;
		break;
	 }
	  map.visualRefresh = true;
	  return map;
   }
   
   Map.setOptions = function(opt){
   
	switch(apiProvider)
	{
	 case 1:
	 case 2:
		this.setOptions(opt);
		break;
	 case 3:
		this.setZoom(opt.zoom);
		this.setCenter(opt.center)
		this.setMapType(opt.mapTypeId);
		bmapTypeOpt = {
			mapTypes: opt.mapTypeControlOptions.mapTypeIds,
			anchor: opt.mapTypeControlOptions.position
		};
		if(opt.mapTypeControl) 
			this.addControl(new BMap.MapTypeControl(bmapTypeOpt));
		break;
	}
   }
   
   
   function MapTypeId()
   {
    var typeid;
     switch(apiProvider)
	 {
     case 1:
		return GMaps.MapTypeId;
		break;
	 case 2:
	    return QMaps.MapTypeId;
	    break;
	 case 3:
		var type = new BMaps.MapType;
		var typeid = {
			ROADMAP : type.BMAP_NORMAL_MAP,
			HYBRID : type.BMAP_PERSPECTIVE_MAP,
		};
	  break;
	 }
	 return typeid;
   }
   
   function ControlPosition()
   {
     switch(apiProvider)
	 {
     case 1: 
      return GMaps.ControlPosition;
	  break;
	 case 2:
	  return QMaps.ControlPosition;
	   break;
	 case 3:
	  var contr_pos = {
		TOP_LEFT: BMaps.ControlAnchor.MAP_ANCHOR_TOP_LEFT,
		TOP_RIGHT: BMaps.ControlAnchor.BMAP_ANCHOR_TOP_RIGHT,
		BOTTOM_LEFT: BMaps.ControlAnchor.BMAP_ANCHOR_BOTTOM_LEFT,
		BOTTOM_RIGHT: BMaps.ControlAnchor.BMAP_ANCHOR_BOTTOM_RIGHT
	  }
	  break;
	}
	  return ;	
   }
   
   
    //Coverage Module
   function StreetViewCoverageLayer()
   {
     var sv_coverage_layer;
	 
     switch(apiProvider)
	 {
	 case 1:
		sv_coverage_layer = new GMaps.StreetViewCoverageLayer();
		break;	
	 case 2:
	    sv_coverage_layer = new QMaps.PanoramaLayer();
		break;
	 case 3:
	    sv_coverage_layer = new BMaps.PanoramaCoverageLayer();
		
		break;
	}
	sv_coverage_layer.setMap = function(map,sv_coverage_layer){
		coverSetMap(map,sv_coverage_layer);
	};
	sv_coverage_layer.removeMap = function(map,sv_coverage_layer){
		coverRemoveMap(map,sv_coverage_layer);
	};	
	return sv_coverage_layer; 
   } 
   
   function coverSetMap(map,cover){
	 switch(apiProvider)
	 {
	 case 1:
	 case 2:
	    cover.setMap(map);
		break;
	 case 3:
		if(map!==null) map.addTileLayer(new BMap.PanoramaCoverageLayer());
		break;
	}
   }
   
   function coverRemoveMap(map,cover){
	 switch(apiProvider)
	 {
	 case 1:
	 case 2:
	    cover.setMap(null);
		break;
	 case 3:
		map.removeTileLayer(cover);
		break;
	}
   }
   
   //Marker Module
/*    function Marker(opt)
   {
      var marker;
      switch(apiProvider)
	  {
	  case 1:
		marker = GMaps.Marker;
	    break;
	  case 2:
        marker = QMaps.Marker;
		break;	
	  case 3: 
        marker = BMaps.Marker;
		break;
	  }
	  marker.call(this,opt.position,{
			title: opt.title,
			icon: opt.icon,
			enableClicking: opt.clickable
	  });
		
	  this.setMap = function(map){
			if(null !== map) map.addOverlay(this);  
			else map.removeOverlay();
		};
   }   */
   
   
   	function Marker(opt)
   {
      var marker;
      switch(apiProvider)
	  {
	  case 1:
		marker = new GMaps.Marker(opt);
	    break;
	  case 2:
        marker = new QMaps.Marker(opt);
		break;	
	  case 3: 
        marker = new BMaps.Marker(opt.position,{
			title: opt.title,
			icon: opt.icon,
			enableClicking: opt.clickable
		});
		marker.setMap = function(map,marker){
			if(map !== null) map.addOverlay(marker);
			else map.removeOverlay(marker);
		};
		break;
	  }
	  return marker;
   }  
   

   
   

   //infoWindow
   function InfoWindow(opt)
   {
      var info; 
	  if(apiProvider==1){
		info = new GMaps.InfoWindow({
        content: opt.content,
        disableAutoPan: opt.disableAutoPan
      });
		info.openInfoWindow = function(map,latlng){
			info.setPosition(latlng);
			info.open(map);
		}
		info.closeInfoWindow = function(map){
			info.close();
		};
	  }
	  else if(apiProvider==2){
		info = new QMaps.InfoWindow({
        content: opt.content,
		map: opt.map
      });
		info.openInfoWindow = function(map,latlng){
			info.setPosition(latlng);
			info.open();
		}
		info.closeInfoWindow = function(map){
			info.close();
		};
	  }
	  else if(apiProvider==3){
		info = new BMaps.InfoWindow(opt.content,{
		enableAutoPan: !(opt.disableAutoPan)
		});
		info.openInfoWindow = function(map,latlng){
			map.openInfoWindow(info, latlng);
		}
		info.closeInfoWindow = function(map){
			map.closeInfoWindow();
		};
	  }	  
	  return info;
   }
    	
	
	
   //StreetViewPanorama
   function StreetViewPanorama(div,opt)
   {
     var streetview;
	 switch(apiProvider)
	  {
	  case 1:
		streetview = new GMaps.StreetViewPanorama(div,opt);
		break;
      case 2:
	    streetview = new QMaps.Panorama(div,opt); 
		break;
	  case 3:
	    streetview = new BMaps.Panorama(div,{ 
			navigationControl: opt.scrollwheel
		}); 
		streetview.getPano = streetview.getId;
		streetview.setPano = function(panoId){
			streetview.setId(panoId);
			trigger("pano_changed");
		}
		break;
	  }
     return streetview;
   }
 

   //Listener
   function addListener(instance, eventName, handler)
   {
	  switch(apiProvider){
	  case 1:
	     GMaps.event.addListener(instance, eventName,handler);
		 break;
	  case 2:
		 QMaps.event.addListener(instance, eventName,handler);
		 break;
	  case 3:
		 BMapLib.EventWrapper.addListener(instance, unifyEvent(eventName), handler);
		 break;
	  }
   }
   
   function addListenerOnce(instance, eventName, handler)
   {
      if(apiProvider==1)
		GMaps.event.addListenerOnce(instance, eventName,handler);
	  else if(apiProvider==2) 
		QMaps.event.addListenerOnce(instance, eventName,handler);
	  else if(apiProvider==3)
		BMapLib.EventWrapper.addListenerOnce(instance, unifyEvent(eventName), handler);
   }
   
   
   function trigger(instance, eventName)
   {
     if(apiProvider==1)
       GMaps.event.trigger(instance, eventName);
	 else if(apiProvider==2) 
	   QMaps.event.trigger(instance, eventName);  
	 else if(apiProvider==3) 
	   BMapLib.EventWrapper.trigger(instance, unifyEvent(eventName));
   }
   
   
   function unifyEvent(eventName){
   		 var evtname;
		 if(eventName == 'idle') evtname = 'tilesloaded';
		 else if(eventName == 'zoom_changed') evtname = 'zoomend';
		 //else if(eventName == 'pano_changed') evtname = 'position_changed';
		 else evtname = eventName;
		 return evtname;
   }
   
   function getEventPos(event){
	 if(apiProvider==1)
		return event.latLng;
	 else if(apiProvider==2) 
	    return event.latLng;  
	 else if(apiProvider==3) 
	    return event.point;
   }
  
  
  //////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////
   function computeOffset(from, distance, heading)
   {
     var loc = null;
     if(apiProvider==1) 
	    loc = GMaps.geometry.spherical.computeOffset(from, distance, heading);
	 else if(apiProvider==2) 
	    loc = QMaps.geometry.spherical.computeOffset(from, distance, heading);
	 else if(apiProvider==3) ;
	 //   loc = BMaps.geometry.spherical.computeOffset(from, distance, heading);  //?
	 return loc;
   }


   
   function disableDefaultUI(map,mystyle)
   {
    if(apiProvider==1) 
	{
	if(mystyle!="")
      map.setOptions({styles: mystyle,disableDefaultUI: true});
	 else
	  map.setOptions({disableDefaultUI: true});
	}
	else if(apiProvider==2)
	{
	  map.setOptions({navigationControl: false,
		scaleControl: false,
		panControl: false,
		zoomControl: false,
		mapTypeControl:false});
	 }
	else if(apiProvider==3)
	{

	}
   }
   
   function disableSVDefaultUI()
   {
   
    var svOptions;
    if(apiProvider==1) 
	{
	  svOptions = {
        visible: true,
        disableDefaultUI: true
      };
	}
	else if(apiProvider==2)
	{
	  svOptions = {
	    visible: true,
        disableCompass: true,
		disableMove:false
	  };
	}
	else if(apiProvider==3)
	{
	  svOptions = {
	    navigationControl: false,
		indoorSceneSwitchControl:false
	  };
	}
	 return svOptions;
   }
   
   function enableSVDefaultUI(svOptions)
   {
     if(apiProvider==1)
	 {
	    svOptions.linksControl = true;
	 }
     else if(apiProvider==2)
	 {
	    svOptions.linksControl = true;
		svOptions.disableCompass = false;
		svOptions.disableMove = false;
	 }
 	 else if(apiProvider==3)
	 {
	    svOptions.navigationControl=true;
		svOptions.indoorSceneSwitchControl=true;
	 } 
   }
   
   
   function setHdgIcon(headingIndex)
   {
     var markerIcon;
     if(apiProvider==1) 
	 {
	    var sWidth = 56.75*parseInt(headingIndex%4);
	    var sHeight = 56.75*parseInt(headingIndex/4);
		markerIcon = {
	      url: 'icons/sv_markers.png',
          // This marker is 56.75 pixels wide by 56.75 pixels tall.
          size: new GMaps.Size(56.75,56.75),
          // The origin for this image is sWidth,sHeight.
          origin: new GMaps.Point(sWidth,sHeight),
          // The anchor for this image is the base of the flagpole at 56.75/2,40.
          anchor: new GMaps.Point(56.75/2,40)
	   };
	 }
	 else if(apiProvider==2)
	 {
	    var sWidth = 56.67*parseInt(headingIndex%3);
		var sHeight = 56.75*parseInt(headingIndex/3);
		markerIcon = new QMaps.MarkerImage(
		"icons/sv_soso_markers.png",
		new QMaps.Size(56.67,56.75),
		new QMaps.Point(sWidth,sHeight),
		new QMaps.Point(56.67/2,32)
		);
	 }
	 else if(apiProvider==3)
	 {
	    var sWidth = 56.67*parseInt(headingIndex%3);
		var sHeight = 56.75*parseInt(headingIndex/3);
		markerIcon = {
		imageUrl: "icons/sv_soso_markers.png",
		imageSize: new BMaps.Size(56.67,56.75),
		imageOffset: new BMaps.Pixel(sWidth,sHeight),
		anchor: new BMaps.pixel(56.67/2,32)
		}
		
		
	 }
	 return markerIcon;
   }
   
   function otherSet(streetview,map,zoom,mymode)
   {
     if(apiProvider==1) 
	 {
	    streetview.setOptions({ mode: mymode });  
       // *** apply the custom streetview object to the map
        map.setStreetView( streetview );
	 }
	 else if(apiProvider==2) 
	 {
	   streetview.setZoom(zoom);
	 }
	 else if(apiProvider==3) 
	 {
	   streetview.setZoom(zoom);
	 }
   }
   
   function MarkerIndex(heading)
   {
     var nindex;
     if(apiProvider==1)
	   nindex = parseInt(heading/22.5)%16;
	 else if(apiProvider==2)
	   nindex = parseInt(heading/30)%12;
	 else if(apiProvider==3)
	   nindex = parseInt(heading/30)%12;
	  return nindex;
   }
  
   
   function DeletePoi(poiArr)
   {
      var nPoiArr = poiArr;
	  
	  for(var i = 0; i < poiArr.length; ++i)
	  {
	    var nPoiSubArr = new Array();
	   for(var j = 0; j < poiArr[i].objects.length; ++j)
	   {
	     if((poiArr[i].objects[j].identifier).match(/^[\w-]{22}$/)&&apiProvider==1)
		 {
		    nPoiSubArr.push(poiArr[i].objects[j]);
		 }
		 else if(!(poiArr[i].objects[j].identifier).match(/^[\w-]{22}$/)&&apiProvider==2)
		 {
		    nPoiSubArr.push(poiArr[i].objects[j]);
		 }
	   }
	    nPoiArr[i].objects = nPoiSubArr;
	  }
	  return nPoiArr;
   }
   
  return{
	apiProvider: apiProvider,
	StreetViewStatus: StreetViewStatus,
	StreetViewService: StreetViewService,
	computeOffset: computeOffset,
	LatLng: LatLng,
	Size: Size,
	Point: Point,
	Map: Map,
	StreetViewPanorama: StreetViewPanorama,
	
	Marker: Marker,
	
	MapTypeId: MapTypeId,
	ControlPosition: ControlPosition,
	InfoWindow: InfoWindow,
	trigger: trigger,
	getEventPos: getEventPos,
	//getPanoramaByLocation: getPanoramaByLocation,
	//getPanoramaById: getPanoramaById,
	disableDefaultUI: disableDefaultUI,
	disableSVDefaultUI: disableSVDefaultUI,
	enableSVDefaultUI: enableSVDefaultUI,
	StreetViewCoverageLayer:StreetViewCoverageLayer,
	
	addListener: addListener,
	addListenerOnce: addListenerOnce,

	setHdgIcon:setHdgIcon,
	otherSet:otherSet,
	
	MarkerIndex:MarkerIndex,
	SetProvider:SetProvider,
	DeletePoi:DeletePoi,
  }
});

