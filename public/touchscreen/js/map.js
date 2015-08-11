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
			this.sv_svc = null;
      this.map = null;
    },

    init: function() {
      console.debug('Map: init');

      var self = this;
			this.markerArray = new Array(3);
			this.poiArray = new Array(3);
			this.mapArray = new Array(3);

      if (typeof XMaps === 'undefined') L.error('Maps API not loaded!');
		
			for(pvd = 0;pvd<3;pvd++){
			var i= pvd;
			if(pvd == 0) this.$canvas = this.$Gcanvas;
			else if(pvd==1) this.$canvas = this.$Qcanvas;
			else if(pvd==2) this.$canvas = this.$Bcanvas;

      this.default_center = new XMaps[i].LatLng(
        config.touchscreen.default_center[XMaps[i].apiProvider - 1].lat,
        config.touchscreen.default_center[XMaps[i].apiProvider - 1].lng
      );

      // use the improved visuals from the maps preview
      XMaps[i].visualRefresh = true;

      var mapOptions = {
        backgroundColor: "black",
     //   center: this.default_center,
      //  zoom: 14,
        disableDefaultUI: true,
        mapTypeControl: config.touchscreen.show_maptypectl,
        mapTypeControlOptions: {
          mapTypeIds: [ XMaps[i].MapTypeId.ROADMAP, XMaps[i].MapTypeId.HYBRID ],
          position: XMaps[i].ControlPosition.TOP_LEFT
        },
        mapTypeId: XMaps[i].MapTypeId[config.touchscreen.default_maptype]
      };
			
      // *** init each map object
			this.map = new XMaps[i].Map(this.$canvas,mapOptions);
			this.map.centerAndZoom(this.default_center, 14);
			this.map.setOptions(mapOptions);
      this.map.setOptions({styles: PeruseMapStyles});

      // instantiate map modules
			console.log("movemarker",i);
      this.sv_coverage = new SVCoverageModule(this.map,i);
      this.sv_marker = new SVMarkerModule(this.map,i);
      this.poi_markers = new POIMarkerModule(this.map,i);
      this.click_search = new ClickSearchModule(this.map,i);
      this.earth_pos = new EarthPosModule(this.map,i);
			
      // handler for marker clicks
      this.poi_markers.on('marker_selected', function(panodata) {
        var latlng = panodata.location.latLng;
        var panoid = panodata.location.pano;

        self._broadcast_pano(panoid);
        self._pan_map(latlng);
        self.sv_marker.hide();
      });

      // handler for click search result
      this.click_search.on('search_result', function(panodata) {
        var latlng = panodata.location.latLng;
        var panoid = panodata.location.pano;

        self._broadcast_pano(panoid);
        self._pan_map(latlng);
        self.sv_marker.move(latlng);
      });

      // handler for earth position report
      this.earth_pos.on('found_location', function(panodata) {
        var latlng = panodata.location.latLng;
        var panoid = panodata.location.pano;

        self._broadcast_pano(panoid);
        self._pan_map(latlng);
        self.sv_marker.move(latlng);
      });

      // disable all <a> tags on the map canvas
     XMaps[i].addListener(this.map, 'idle', function() {
        var links = self.$canvas.getElementsByTagName("a");
        var len = links.length;
        for (var i = 0; i < len; i++) {
          links[i].style.display = 'none';
          links[i].onclick = function() {return(false);};
        }
      });

      // signal that the map is ready
      XMaps[i].addListenerOnce(this.map, 'idle', function() {
        console.debug('Map: ready');
        self.emit('ready');
      });
			
			this.mapArray[i] = this.map;
			this.markerArray[i] = this.sv_marker;
			this.poiArray[i] = this.poi_markers;
		}
		
			this.provider = config.provider - 1;
			this.pvdname = config.pvdname;
			this.sv_svc = sv_svc[this.provider];
			this.map = this.mapArray[this.provider];
			this.sv_marker = this.markerArray[this.provider];
			this.poi_markers = this.poiArray[this.provider];
    },

    zoom_in: function() {
      this.map.setZoom(this.map.getZoom() + 1);
    },

    zoom_out: function() {
      this.map.setZoom(this.map.getZoom() - 1);
    },

    _pan_map: function(latlng) {
      this.map.panTo(latlng);
    },

    _broadcast_pano: function(panoid) {
      this.emit('pano', panoid);
      var self = this;
      sv_svc[this.provider].getPanoramaById(
        panoid,
        function (data, stat) {
					
          if (stat == XMaps[self.provider].StreetViewStatus.OK) {
            sv_svc[self.provider].serializePanoData(data);
            self.emit('meta', data);
          }
        }
      );
    },
		
		_broadcast_panopvd: function(panopvd){
			this.emit('panopvd',panopvd);
			var self = this;
			sv_svc[panopvd.pvd].getPanoramaById(
        panoid,
        function (data, stat) {
          if (stat == XMaps[panopvd.pvd].StreetViewStatus.OK) {
            sv_svc[self.provider].serializePanoData(data);
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
		
		
		_change_map_shown: function(pvdid){
			
			if(pvdid == 0) {
				this.$Gcanvas.style.display = "block";
				this.$Qcanvas.style.display = "none";
				this.$Bcanvas.style.display = "none";
			}
			else if(pvdid == 1){
				this.$Gcanvas.style.display = "none";
				this.$Qcanvas.style.display = "block";
				this.$Bcanvas.style.display = "none";
			}
			else if(pvdid == 2){
				this.$Gcanvas.style.display = "none";
				this.$Qcanvas.style.display = "none";
				this.$Bcanvas.style.display = "block";
			}
		},
		
		add_location_by_id: function(panoid) {
				this.poi_markers.add_location_by_id(panoid);
    },

    // select is called when the streetview location is selected from the local
    // interface (poi).  it should pan the map, move the marker, and broadcast
    // the location to displays.
    select_pano_by_id: function(panoid) {
      var self = this;
      this.sv_svc.getPanoramaById(
        panoid,
        function (data, stat) {
          if(stat == XMaps[self.provider].StreetViewStatus.OK) {
            var result_latlng = data.location.latLng;
            var result_panoid = data.location.pano;
			
						console.log(result_latlng);
						console.log(result_panoid);

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
			
      this.sv_svc.getPanoramaById(
        panoid,
        function (data, stat) {
          if(stat == XMaps[self.provider].StreetViewStatus.OK) {
            var result_latlng = data.location.latLng;
            var result_panoid = data.location.pano;
						console.log(self.provider);
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
		
		update_map_pvd: function(panopvd) {
			self = this;
			
			var pvd = panopvd.pvd;
			var pano = panopvd.pano;
			var pvdid = 0;
	
			if(pvd == 'google') pvdid = 0;
			else if(pvd == 'tencent')	pvdid = 1;
			else if(pvd == 'baidu')	pvdid = 2;
			
			if (pvdid != this.provider){
				this.sv_svc[pvdid].getPanoramaById(
					pano,
					function(data,stat){
						if(stat == XMaps[pvdid].StreetViewStatus.OK){
							var result_latlng = data.location.latLng;
							var result_panoid = data.location.pano;
							
							self.provider =  pvdid;
							self.pvdname = self._get_pvd_name(pvdid);
							self.map = this.mapArray[self.provider];
							self.sv_svc = sv_svc[pvdid];
							self.sv_marker = this.markerArray[pvdid];
							self._change_map_shown(pvdid);
							
							self._broadcast_panopvd(panopvd);
							self._pan_map(result_latlng);
							self.sv_marker.move(result_latlng);
						}
					}
				);
			}
			else this.update_pano_by_id(pano);
		},

  });

  return MapModule;
});
