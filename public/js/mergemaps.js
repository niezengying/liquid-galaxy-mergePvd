/*份
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
var tencentKey = config.tencentKey;
var baiduKey = config.baiduKey;
  
var mapByPvd  = function(provider){ 
  var apiProvider = provider+1;
  
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
    switch(apiProvider)
    {
    case 1:
      loc = new GMaps.LatLng(lat,lng);
      break;
    case 2:
      loc = new QMaps.LatLng(lat,lng);
      break;
    case 3:
      loc = new BMaps.Point(lng,lat);
      break;
    }
    return loc;
   }
   
  function Point(x,y)
  {
    var point;
    switch(apiProvider)
    {
    case 1:
      point = new GMaps.Point(x,y);
      break;
    case 2:
      point = new QMaps.Point(x,y);
      break;
    case 3:
      point = new BMaps.Pixel(x,y);
      break;
    }
    return point;
  }

   
  function Size(width,height)
  {
    var size;
    switch(apiProvider)
    {
    case 1:
      size = new GMaps.Size(width,height);
      break;
    case 2:
      size = new QMaps.Size(width,height);
      break;
    case 3:
      size = new BMaps.Size(width,height);
      break;
    }
    return size;
  }
      
     
  // streetview Service
  var tmpsv = new BMaps.PanoramaService();   
  function StreetViewService(){
    var sv;
    switch(apiProvider)
    {
    case 1:
      sv = new GMaps.StreetViewService();
      break;
      
    case 2:    
      sv = new QMaps.PanoramaService();
      sv.getPanoramaById = function(panoid,cb){
        var data = null;
       // console.log(panoid);
        if (panoid.match(/^\w+$/)){    
        $.getJSON("http://apis.map.qq.com/ws/streetview/v1/getpano?id="+panoid+"&radius=50&key="+tencentKey+"&output=jsonp&callback=?",
          function(ret) {
       //   console.log(ret);
          if(ret.status == 0){
            data = {location: {pano:ret.detail.id,latLng: new QMaps.LatLng(ret.detail.location.lat,ret.detail.location.lng),description:ret.detail.description}};
            //data = {location: {pano:ret.detail.id,latLng:ret.detail.location,description:ret.detail.description}};
            cb(data,StreetViewStatus.OK);
          }   
        });
      }};
      
      sv.getPanoramaByLocation = function(position, radius, cb){
        sv.getPano(position,radius,function(ret){
        if(ret != null){
          data = {location: {pano:ret.id,latLng:ret.latlng,description:ret.description} };
          cb(data,StreetViewStatus.OK);
        }   
       });
      };
      break;
      
    case 3:
      sv = new BMaps.PanoramaService(); 
      sv.getPanoramaById = function(panoid,cb){
        tmpsv.getPanoramaById(panoid,
        function(ret){
          if (ret == null)   return;  
          data = {
            location: {pano:ret.id,latLng:ret.position,description:ret.description},
            links:ret.links,
            tiles:ret.tiles
          };
          cb(data,StreetViewStatus.OK);  
        });    
      };
      
      sv.getPanoramaByLocation = function(position,radius,cb){
        tmpsv.getPanoramaByLocation(position,radius,function(ret){
          if (ret == null)   return;  
          data = {
            location: {pano:ret.id,latLng:ret.position,description:ret.description},
            links:ret.links,
            tiles:ret.tiles
          };
          cb(data,StreetViewStatus.OK);  
        });  
      };  
      break;
    }
    return sv;
   }
     
     
  function getPanoramaByOffset(from, distance, heading, maxDis, cb, panoid, dir)
  {
    var sv_svc =  new QMaps.PanoramaService();
    var nextLoc = QMaps.geometry.spherical.computeOffset(from, dir*distance, heading);
    var search_opts = {
        latlng: nextLoc,           //update data
        distance: distance,        //update data
        maxDis: maxDis || distance, //constant data
        cb: cb,
        heading: heading,        //constant data
        from: from,              //constant data
        panoid: panoid,       //constant data
        dir: dir             //constant data
        }; 
    sv_svc.getPanoramaByLocation(
      nextLoc,
      distance,
      expandingOB.bind(search_opts)
    );
  }
  
  function expandingOB(data) {
    if(data != null&&data.svid != this.panoid) {
      this.cb(data);
    }   
    else if (this.distance < this.maxDis) {
    this.distance = this.distance*2;
    if (this.distance > this.maxDis)
        this.distance = this.maxDis;
    getPanoramaByOffset(
      this.from, 
      this.distance, 
      this.heading, 
      this.maxDis, 
      this.cb, 
      this.panoid, 
      this.dir )
    }
    else {  // failure
      this.cb(data);
    }
    // explicit cleanup
      delete this;
    } 
    
    
  // Map Module     
   function Map(div,opt)
   {
    var map;
    switch(apiProvider)
    {
    case 1:
      map = new GMaps.Map(div,opt);
      map.addOverlay = function(overlay){
        overlay.setMap(map);
      };
      map.centerAndZoom = function(center,zoom){
        map.setCenter(center);
        map.setZoom(zoom);
      };
      map.setCustom = function(opt){
        map.setOptions({styles: opt});
      };
      break;
    case 2:
      map = new QMaps.Map(div,opt); 
      map.addOverlay = function(overlay){
        overlay.setMap(map);
      };
      map.setStreetView = function(streetview){};
      map.centerAndZoom = function(center,zoom){
        map.setCenter(center);
        map.setZoom(zoom);
      };
      map.setCustom = function(opt){
        map.setOptions({
          navigationControl: false,
          scaleControl: false,
          panControl: false,
          zoomControl: false,
        });
      };
    
      break;
   case 3:
      map = new BMaps.Map(div,opt);  
      map.setStreetView = map.setPanorama;
      map.setOptions = function(opt){
        if(opt.mapTypeControl){
          map.enableScrollWheelZoom();
        }
      };
      map.setCustom = function(opt){
        if(opt.mapTypeControl){
          map.enableScrollWheelZoom();
        }
      }
      break;
    }
    return map;
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
      };
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
      sv_coverage_layer.removeMap = function(map){
        sv_coverage_layer.setMap(null);
      };
      break;  
     case 2:
      sv_coverage_layer = new QMaps.PanoramaLayer();
      sv_coverage_layer.removeMap = function(map){
      sv_coverage_layer.setMap(null);
      };
      break;
     case 3:
      sv_coverage_layer = new BMaps.PanoramaCoverageLayer();
      sv_coverage_layer.setMap = function(map){
        if(map!==null) map.addTileLayer(sv_coverage_layer);
      };
      sv_coverage_layer.removeMap = function(map){
        map.removeTileLayer(sv_coverage_layer);
      }
      break;
    }
    return sv_coverage_layer; 
   } 
   
   
   //Marker Module
   function Marker(opt)
   {
    self = this;
    var marker;
    switch(apiProvider)
    {
    case 1:
      marker = new GMaps.Marker(opt);
      marker.removeMap = function(map){
        marker.setMap(null);
      };
      marker.setIcons = marker.setIcon;
      break;
    case 2:
      marker = new QMaps.Marker(opt);
      marker.removeMap = function(map){
        marker.setMap(null);
      }
      marker.setIcons = marker.setIcon;
      break;  
    case 3: 
      marker = new BMaps.Marker(opt.position);
      marker.setMap = function(map){
       // marker.show();
        map.addOverlay(marker);
        marker.setTop(true);
      };
      marker.removeMap = function(map){
        map.removeOverlay(marker);
       // marker.hide();
      };
      marker.setIcons = function(url){
        icon = new BMap.Icon(url,new BMap.Size(56.5,56.5));
        marker.setIcon(icon);
      };
      break;
    }
    return marker;
   }  

   //InfoWindow Module
   function InfoWindow(opt)
   {
    var info; 
    switch(apiProvider)
    {
    case 1:
      info = new GMaps.InfoWindow({
        content: opt.content,
        disableAutoPan: opt.disableAutoPan
        });
      info.openInfoWindow = function(map,latlng){
        info.setPosition(latlng);
        info.open(map);
      };
      info.closeInfoWindow = function(map){
        info.close();
      };
      break;
    
    case 2:
      info = new QMaps.InfoWindow({
          content: opt.content,
      map: opt.map
      });
      info.openInfoWindow = function(map,latlng){
        info.setPosition(latlng);
        info.open();
      };
      info.closeInfoWindow = function(map){
        info.close();
      };
      break;  
      
    case 3: 
      info = new BMaps.InfoWindow(opt.content,{
      enableAutoPan: !(opt.disableAutoPan)
      });
      info.openInfoWindow = function(map,latlng){
        map.openInfoWindow(info, latlng);
      };
      info.closeInfoWindow = function(map){
        map.closeInfoWindow();
      };
      break;
      }    
    return info;
   }
      
   //StreetViewPanorama Module
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
        streetview.getLinks = function(){
          var fromloc = streetview.getPosition();
          var distance = config.display.move_Range;
          var pov = streetview.getPov();
          var panoid = streetview.getPano();
          var links = null;
          getPanoramaByOffset(fromloc, distance, pov.heading, 10*distance, function(ret){
            links = {description:ret.description, pano:ret.pano, heading:heading};
          }, panoid, 1);
          
          return links;
        }; 
        break;
      case 3:
        streetview = new BMaps.Panorama(div,{ 
          navigationControl: opt.navigationControl,
          linksControl: opt.linksControl
        }); 
        streetview.disableScrollWheelZoom();
        streetview.getPano = streetview.getId;
        streetview.setPano = function(panoId){
          streetview.setId(panoId);
          trigger("position_changed");
        };
        break;
      }
     return streetview;
   }
 
   
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
    switch(apiProvider){
    case 1:
      GMaps.event.addListenerOnce(instance, eventName,handler);
      break;
    case 2:
      QMaps.event.addListenerOnce(instance, eventName,handler);
      break;
    case 3:
      BMapLib.EventWrapper.addListenerOnce(instance, unifyEvent(eventName), handler);
      break;
    }
   }
   
   function trigger(instance, eventName)
   {
    switch(apiProvider){
    case 1:
      GMaps.event.trigger(instance, eventName);
      break;
    case 2:
      QMaps.event.trigger(instance, eventName);  
      break;
    case 3:
      BMapLib.EventWrapper.trigger(instance, unifyEvent(eventName));
      break;
    }
   }  
   
  function unifyEvent(eventName){
    var evtname;
    //if(eventName == 'idle') evtname = 'tilesloaded';
    if(eventName == 'idle') evtname = 'tilesloaded';
    else if(eventName == 'zoom_changed') evtname = 'zoomend';
    else if(eventName == 'pano_changed') evtname = 'position_changed';
    else evtname = eventName;
    return evtname;
  }
   
  // get the event position
  function getEventPos(event){
    switch(apiProvider){
    case 1:
      return event.latLng;
    break;
    case 2:
      return event.latLng;  
    break;
    case 3:
      return event.point;
    break;
    }
   }
  
    
   
  return{
  apiProvider: apiProvider,
  MapTypeId: MapTypeId,
  ControlPosition: ControlPosition,  
  StreetViewStatus: StreetViewStatus,

  
  Point: Point,
  LatLng: LatLng,
  Size: Size,

  Map: Map,
  StreetViewPanorama: StreetViewPanorama,
  StreetViewService: StreetViewService,
  
  Marker: Marker,
  InfoWindow: InfoWindow,
  StreetViewCoverageLayer:StreetViewCoverageLayer,

  getEventPos: getEventPos,
  trigger: trigger,
  addListener: addListener,
  addListenerOnce: addListenerOnce,

  SetProvider:SetProvider
  }
  
  };
  
  var Maps = new Array(3);
   
   for(i = 0;i<3;i++){
    Maps[i] = mapByPvd(i);
   }
   
  return Maps;
});

