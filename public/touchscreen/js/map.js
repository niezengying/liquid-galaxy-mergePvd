/*
** Copyright 2013 Google Inc.
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

define(
[
  'config', 'bigl', 'stapes', 'mapstyle', 'mergemaps', 'sv_svc',
  // map submodules
  'map/coverage', 'map/svmarker', 'map/clicksearch', 'map/poimarkers',
  'map/earthpos'
],
function(
  config, L, Stapes, PeruseMapStyles, XMaps, sv_svc,
  // map submodules
  SVCoverageModule, SVMarkerModule, ClickSearchModule, POIMarkerModule,
  EarthPosModule
) {

  var MapModule = Stapes.subclass({
    constructor: function($Gcanvas,$Qcanvas,$Bcanvas) {
      this.$Gcanvas = $Gcanvas;
      this.$Qcanvas = $Qcanvas;
      this.$Bcanvas = $Bcanvas;
      
      this.$canvas = null;
      this.provider = null;
      this.map = null;
      this.sv_marker = null;
    },

    init: function() {
      console.debug('Map: init');

      var self = this;
      this.mkrArray = new Array(3);
      this.poiArray = new Array(3);
      this.mapArray = new Array(3);
      this.clkArray = new Array(3);
      this.cvgArray = new Array(3);

      if (typeof XMaps === 'undefined') L.error('Maps API not loaded!');
      

      for(i = 0; i<3; i++){
        
      this._change_sv_div(i);
      
      this.default_center = new XMaps[i].LatLng(
        config.touchscreen.default_center[i].lat,
        config.touchscreen.default_center[i].lng
      );

      // use the improved visuals from the maps preview
      XMaps[i].visualRefresh = true;

      var mapOptions = {
      //  center: this.default_center,
      //  zoom: 14,
        backgroundColor: "black",
        disableDefaultUI: true,
        mapTypeControl: config.touchscreen.show_maptypectl,
        mapTypeControlOptions: {
          mapTypeIds: [ XMaps[i].MapTypeId.ROADMAP, XMaps[i].MapTypeId.HYBRID ],
          position: XMaps[i].ControlPosition.TOP_LEFT
        },
        mapTypeId: XMaps[i].MapTypeId[config.touchscreen.default_maptype],
      };

      // *** init each map object
      this.map = new XMaps[i].Map(this.$canvas,mapOptions);
      this.map.centerAndZoom(this.default_center, 14);
      this.map.setOptions(mapOptions);
      this.map.setOptions({styles: PeruseMapStyles});
      //this.map.setCustom(mapOptions);
      this.mapArray[i] = this.map;
      
          
      this.cvgArray[i] = new SVCoverageModule(this.mapArray[i],i);
      this.mkrArray[i]= new SVMarkerModule(this.mapArray[i],i);
      this.poiArray[i] = new POIMarkerModule(this.mapArray[i],i);
      this.clkArray[i] = new ClickSearchModule(this.mapArray[i],i);      
      
      this.poiArray[i].on('marker_selected', function(panodata) {
        var latlng = panodata.location.latLng;
        var panoid = panodata.location.pano;
        var pvdid = self.provider;
        
        var panopvd = {pano:panoid, pvd:pvdid};
        self._broadcast_panopvd(panopvd);
      //  self._broadcast_pano(panoid);
        self.sv_marker.hide();
        self._pan_map(latlng);
      });

      // handler for click search result
      this.clkArray[i].on('search_result', function(panodata) {
        var pvdid = self.click_search.provider;
        var latlng = panodata.location.latLng;
        var panoid = panodata.location.pano;

        var panopvd = {pano:panoid, pvd:pvdid};
        self._broadcast_panopvd(panopvd);
      //  self._broadcast_pano(panoid);
        self._pan_map(latlng);
        self.sv_marker.move(latlng);
      });
      
      }
      
      // handler for earth position report
      this.earth_pos = new EarthPosModule(this.mapArray[0]);
      this.earth_pos.on('found_location', function(panodata) {
        var latlng = panodata.location.latLng;
        var panoid = panodata.location.pano;

        self._broadcast_pano(panoid);
        self._pan_map(latlng);
        self.sv_marker.move(latlng);
      });
       
      this._switch_map(config.provider-1);   
       
      // instantiate map modules
      for(idx=0;idx<3;idx++){
      // disable all <a> tags on the map canvas
        XMaps[idx].addListener(this.mapArray[idx], 'idle', function() {
          self._change_sv_div(idx);
          var links = self.$canvas.getElementsByTagName("a");
          var len = links.length;
          for (var i = 0; i < len; i++) {
            links[i].style.display = 'none';
            links[i].onclick = function() {return(false);};
          }
        });

        XMaps[idx].addListenerOnce(this.mapArray[idx], 'idle', function() {
          console.debug('Map: ready');
          self.emit('_ready');
        });
      }
      
      var time = 0;
      this.on('_ready', function() {
        time++;
        if(time == 3) this.emit('ready');
      });     
    },

    zoom_in: function() {
      this.map.setZoom(this.map.getZoom() + 1);
    },

    zoom_out: function() {
      this.map.setZoom(this.map.getZoom() - 1);
    },
    
     _switch_map: function(pvdid){
      this.provider = pvdid;
      this.map = this.mapArray[pvdid];
      this.sv_marker = this.mkrArray[pvdid];
      this.poi_markers = this.poiArray[pvdid];
      this.click_search = this.clkArray[pvdid];
      this.sv_coverage = this.cvgArray[pvdid];
      this._change_map_shown(pvdid);
    }, 

    _pan_map: function(latlng) {
      this.map.panTo(latlng);
    },
    
    _broadcast_pvd: function(pvdid){
      this._switch_map(pvdid);
      this.emit('pvd',pvdid);
    },

    _broadcast_pano: function(panoid) {
      this.emit('pano', panoid);
      var self = this;
      sv_svc[this.provider].getPanoramaById(
        panoid,
        function (data, stat) {
          console.log(data);
          if (stat == XMaps[self.provider].StreetViewStatus.OK) {
            //sv_svc[self.provider].serializePanoData(data);
            self.emit('meta', data);
          }
        }
      );
    },
    
    _broadcast_panopvd: function(panopvd){
      this.emit('panopvd',panopvd);
      var self = this;

      sv_svc[this.provider].getPanoramaById(
        panopvd.pano,
        function (data, stat) {        
          if (stat == XMaps[self.provider].StreetViewStatus.OK) {
            //sv_svc[self.provider].serializePanoData(data);
            self.emit('meta', data);
          }
        }
      );
    },
    
    _get_pvd_id: function(pvd){
      if(pvd == "google") return 0;
      else if(pvd == "tencent") return 1;
      else return 2;
    },
    
    _get_pvd_name: function(pvdid){
      if(pvdid == 0) return "google";
      else if(pvd == 1) return "tencent";
      else return "baidu";
    },
    
    _change_map_shown:function(pvdid){
      var cvArray = [this.$Gcanvas,this.$Qcanvas,this.$Bcanvas];
      for(i = 0; i<3; i++){
        $curdiv = cvArray[i];
        if(i == pvdid) $curdiv.style.display = 'block';
        else $curdiv.style.display = 'none';
      }
    },
  
    
    _change_map_shown2: function(pvdid){
      var cvArray = [this.$Gcanvas,this.$Qcanvas,this.$Bcanvas];
      cvArray.forEach(function(canvas,idx){
        if(idx == pvdid)
          canvas.style.display = 'block';
        else
          canvas.style.display = 'none';
      });
    },
    
    add_location_by_id: function(panoid) {
        this.poi_markers.add_location_by_id(panoid);
    },
    
    add_location_by_panopvd: function(panopvd) {
        this.poiArray[panopvd.pvd].add_location_by_id(panopvd.pano);
    },
    
    add_photosphere_by_id: function(panoid) {
        this.poiArray[0].add_location_by_id(panoid);
    },

    // select is called when the streetview location is selected from the local
    // interface (poi).  it should pan the map, move the marker, and broadcast
    // the location to displays.
    select_pano_by_id: function(panoid) {
      var self = this;
      sv_svc[this.provider].getPanoramaById(
        panoid,
        function (data, stat) {
          if(stat == XMaps[self.provider].StreetViewStatus.OK) {
            var result_latlng = data.location.latLng;
            var result_panoid = data.location.pano;
            self._broadcast_pano(result_panoid);
            self._pan_map(result_latlng);
            self.sv_marker.hide();
          } else {
            L.error('Map: select query failed!');
          }
        }
      );
    },

    // update is called when the streetview location is changed by display
    // clients.  it should pan the map and move the marker to the new location.
    update_pano_by_id: function(panoid) {
      var self = this;
      sv_svc[this.provider].getPanoramaById(
        panoid,
        function (data, stat) {
          if(stat == XMaps[self.provider].StreetViewStatus.OK) {
            var result_latlng = data.location.latLng;
            var result_panoid = data.location.pano;

            self._pan_map(result_latlng);
            self.sv_marker.move(result_latlng);
          } else {
            L.error('Map: update query failed!');
          }
        }
      );
    },
    
    
    
    // update is called when the map provider is changed poi-items
    // it should pan the map and move the marker to the new location.
    
    update_by_panopvd: function(panopvd) {
      self = this;
      var pvdid = panopvd.pvd;
      var panoid = panopvd.pano;
      sv_svc[pvdid].getPanoramaById(
        panoid,
        function(data,stat){
          if(stat == XMaps[pvdid].StreetViewStatus.OK){
            var result_latlng = data.location.latLng;
            var result_panoid = data.location.pano;
            
            self.provider =  pvdid;
            self.map = self.mapArray[pvdid];
            self.sv_marker = self.mkrArray[pvdid];
            self.poi_markers = self.poiArray[pvdid];
            self.click_search = self.clkArray[pvdid];
            self.sv_coverage = self.cvgArray[pvdid];
            
            self._broadcast_panopvd(panopvd);
            self._pan_map(result_latlng);
            self.sv_marker.move(result_latlng);
          }
        }
      );
     this._change_map_shown(pvdid);
    },
    
    update_map_by_pvd: function(pvdid){
      this.provider = pvdid;
      this.map = this.mapArray[pvdid];
      this.sv_marker = this.mkrArray[pvdid];
      this.poi_markers = this.poiArray[pvdid];
      this.click_search = this.clkArray[pvdid];
      this.sv_coverage = this.cvgArray[pvdid];
      
      this._change_map_shown(pvdid);
    },
    
    _change_sv_div: function(pvdid){
      if(0==pvdid)   this.$canvas = this.$Gcanvas;
      else if(1==pvdid) this.$canvas = this.$Qcanvas;
      else if(2==pvdid) this.$canvas = this.$Bcanvas;      
    }
  });

  return MapModule;
});
