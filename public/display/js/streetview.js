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
['config', 'bigl', 'validate', 'stapes','mergemaps'],
function(config, L, validate, Stapes, XMaps) {
  var StreetViewModule = Stapes.subclass({

    // street view horizontal field of view per zoom level
    // varies per render mode
    SV_HFOV_TABLES: {
      "webgl": [
        127,
        90,
        53.5,
        28.125,
        14.25
      ],
      "html4": [
        180,
        90,
        45,
        22.5,
        11.25
      ],
      "html5": [
        127,
        90,
        53.5,
        28.125,
        14.25
      ],
      "flash": [
        180,
        90,
        45,
        22.5,
        11.25
      ]
    },

    constructor: function($Gcanvas,$Qcanvas,$Bcanvas,master) {
      this.$canvas = null;
			this.$Gcanvas = $Gcanvas;
			this.$Qcanvas = $Qcanvas,
			this.$Bcanvas = $Bcanvas,
      this.master = master;
      this.map = null;
      this.streetview = null;
      this.meta = null;
      this.pov = null;
      this.mode = config.display.mode;
      this.zoom = config.display.zoom;
      this.fov_table = this.SV_HFOV_TABLES[this.mode];
      this.hfov = this.fov_table[this.zoom];
      this.vfov = null;
			
			this.provider = config.provider-1;
			this.streetview = null;
			this.mapArray = new Array(3);
			this.svArray = new Array(3);
    },

    // PUBLIC

    // *** init()
    // should be called once when ready to set Maps API into motion
    init: function() {
      console.debug('StreetView: init');

      var self = this;

      // *** ensure success of Maps API load
      if (typeof XMaps === 'undefined') L.error('Maps API not loaded!');

      // *** initial field-of-view
      this._resize();
			
			// *** options for the streetview object
			var mapOptions = {
				disableDefaultUI: true,
				backgroundColor: "black",
				zoom: 8
			};
			
			var svOptions = {
					visible: true,
					disableDefaultUI: true,
					scrollwheel: false
			};
			
			// *** only show links on the master display
			if (this.master && config.display.show_links) {
				svOptions.linksControl = true;
			}
		
			// *** create three streetview query object
			for(i=0;i<3;i++){
				if(i == 0) 	this.$canvas = this.$Gcanvas;
				else if(i==1) this.$canvas = this.$Qcanvas;
				else if(i==2) this.$canvas = this.$Bcanvas;
				
				// *** create a local streetview query object
				this.sv_svc = new XMaps[i].StreetViewService();
				
				// *** options for the map object
				// the map will never be seen, but we can still manipulate the experience
				// with these options.
				this.default_center = new XMaps[i].LatLng(
					config.touchscreen.default_center[XMaps[i].apiProvider - 1].lat,
					config.touchscreen.default_center[XMaps[i].apiProvider - 1].lng
				);
				console.log(this.default_center);

				// *** init map object
				this.map = new XMaps[i].Map(
					this.$canvas,
					mapOptions
				);
				
				this.map.centerAndZoom(this.default_center,8);

				// *** init streetview object
				this.streetview = new XMaps[i].StreetViewPanorama(
					this.$canvas,
					svOptions
				);

				// *** init streetview pov
				this.streetview.setPov({
					heading: 0,
					pitch: 0
				});
				
				this.streetview.setZoom(this.zoom);
				this.streetview.setPano(config.display.default_pano[XMaps[i].apiProvider-1]);
		
				// *** set the display mode as specified in global configuration
				this.streetview.setOptions({ mode: this.mode });
				if (config.display.show_labels) {
					this.streetview.setOptions({'indoorSceneSwitchControl': true});
					//this.streetview.setPanoramaPOIType();
				}

				// *** apply the custom streetview object to the map
				this.map.setStreetView( this.streetview );
				

				// *** events for master only
				if (this.master) {
					// *** handle view change events from the streetview object
				 XMaps[i].addListener(this.streetview, 'pov_changed', function() {
						var pov = self.streetview.getPov();

						self._broadcastPov(pov);
						self.pov = pov;
					});

					// *** handle pano change events from the streetview object
				 XMaps[i].addListener(this.streetview, 'pano_changed', function() {
						var panoid = self.svArray[i].getPano();

						if (panoid != self.pano) {
							self._broadcastPano(panoid);
							self.pano = panoid;
							self.resetPov();
						}
					});
				}

				// *** disable <a> tags at the bottom of the canvas
			 XMaps[i].addListenerOnce(this.map, 'idle', function() {
					var links = self.$canvas.getElementsByTagName("a");
					var len = links.length;
					for (var i = 0; i < len; i++) {
						links[i].style.display = 'none';
						links[i].onclick = function() {return(false);};
				 }
				});

				// *** request the last known state from the server
				this.on('ready', function() {
					self.emit('refresh');
				});

				// *** wait for an idle event before reporting module readiness
				XMaps[i].addListenerOnce(this.map, 'idle', function() {
					console.debug('StreetView: ready');
					self.emit('ready');
				});
				
				this.svArray[i] = this.streetview;
				this.mapArray[i] = this.map;
			}
			this.provider = config.provider-1;
			this.streetview = this.svArray[this.provider];
			this.map = this.mapArray[this.provider];
				
      // *** handle window resizing
      window.addEventListener('resize',  function() {
        self._resize();
      });
    },

    // *** setPanopvd(provider)
    // switch to the provided provider, immediately
    setPanopvd: function(panopvd) {
      if (!validate.pvd(panopvd)) {
        L.error('StreetView: bad pvd to setPvd!');
        return;
      }
			var pvd = panopvd.pvd;
			var pano = panopvd.pano;
			
			var tmppvd = 0;
			if(pvd == 'google') {
				tmppvd = 0;
			//	this.$Gcanvas.style.display = "block";
		//		this.$Qcanvas.style.display = "none";
			//	this.$Bcanvas.style.display = "none";
			}
			else if(pvd == 'tencent'){
				tmppvd = 1;
			//	this.$Gcanvas.style.display = "none";
		//		this.$Qcanvas.style.display = "block";
			//	this.$Bcanvas.style.display = "none";
			}
			else if(pvd == 'baidu'){
				tmppvd = 2;
			//	this.$Gcanvas.style.display = "none";
			//	this.$Qcanvas.style.display = "none";
			//	this.$Bcanvas.style.display = "block";
			}
			
      if (tmppvd != this.provider) {
        this.provider = tmppvd;
        this.streetview = this.svArray[tmppvd];
				this.setPano(panopvd.pano);
      } else {
				this.setPano(panopvd.pano);
      }
    },		

    // *** setPano(panoid)
    // switch to the provided pano, immediately
    setPano: function(panoid) {
      if (!validate.panoid(panoid)) {
        L.error('StreetView: bad panoid to setPano!');
        return;
      }
	  
      if (panoid != this.streetview.getPano()) {
        this.pano = panoid;
        this.streetview.setPano(panoid);
        this.resetPov();
      } else {
        console.warn('StreetView: ignoring redundant setPano');
      }
    },

    // *** setPov(XMaps.StreetViewPov)
    // set the view to the provided pov, immediately
    setPov: function(pov) {
      if (!validate.number(pov.heading) || !validate.number(pov.pitch)) {
        L.error('StreetView: bad pov to setPov!');
        return;
      }

      this.streetview.setPov(pov);
    },

    // *** restPov(Xmaps.StreetViewPov)
    // reset the pitch for the provided pov
    resetPov: function() {
      if (! this.master) {
        return;
      }
      var pov = this.streetview.getPov();
      pov.pitch = 0;
      pov.zoom = this.zoom;
      this.setPov(pov);
    },

    // *** setHdg(heading)
    // set just the heading of the POV, zero the pitch
    setHdg: function(heading) {
      if (!validate.number(heading)) {
        L.error('StreetView: bad heading to setHdg!');
        return;
      }

      this.setPov({ heading: heading, pitch: 0 });
    },

    // *** translatePov({yaw, pitch})
    // translate the view by a relative pov
    translatePov: function(abs) {
      if (!validate.number(abs.yaw) || !validate.number(abs.pitch)) {
        L.error('StreetView: bad abs to translatePov!');
        return;
      }

      var pov = this.streetview.getPov();

      pov.heading += abs.yaw;
      pov.pitch   += abs.pitch;

      this.streetview.setPov(pov);
    },

    // *** moveForward()
    // move to the pano nearest the current heading
    moveForward: function() {
      console.log('moving forward');
      var forward = this._getForwardLink();
      if(forward) {
				var fwdpano = (forward.pano==null?forward.id:forward.pano);
        this.setPano(fwdpano);
        this._broadcastPano(fwdpano);
      } else {
        console.log("can't move forward, no links!");
      }
    },

    // PRIVATE

    // *** _resize()
    // called when the canvas size has changed
    _resize: function() {
      var screenratio = window.innerHeight / window.innerWidth;
      this.vfov = this.hfov * screenratio;
      this.emit('size_changed', {hfov: this.hfov, vfov: this.vfov});
      console.debug('StreetView: resize', this.hfov, this.vfov);
    },

    // *** _broadcastPov(XMaps.StreetViewPov)
    // report a pov change to listeners
    _broadcastPov: function(pov) {
      this.emit('pov_changed', pov);
    },

    // *** _broadcastPano(panoid)
    // report a pano change to listeners
    _broadcastPano: function(panoid) {
      this.emit('pano_changed', panoid);

      var self = this;
      sv_svc[this.provder].getPanoramaById(
        panoid,
        function (data, stat) {
          if (stat == XMaps[self.provider].StreetViewStatus.OK && sv_svc[self.provder]) {
            sv_svc[this.provder].serializePanoData(data);
            self.emit('meta', data);
          }
        }
      );
    },

    // *** _getLinkDifference(
    //                         XMaps.StreetViewPov,
    //                         XMaps.StreetViewLink
    //                       )
    // return the difference between the current heading and the provided link
    _getLinkDifference: function(pov, link) {
      var pov_heading = pov.heading;
      var link_heading = link.heading;

      var diff = Math.abs(link_heading - pov_heading) % 360;

      return diff >= 180 ? diff - (diff - 180) * 2 : diff;
    },

    // *** _getForwardLink()
    // return the link nearest the current heading
    _getForwardLink: function() {
      var pov = this.streetview.getPov();
      var links = this.streetview.getLinks();
      var len = links.length;
      var nearest = null;
      var nearest_difference = 360;

      for(var i=0; i<len; i++) {
        var link = links[i];
        var difference = this._getLinkDifference(pov, link);
        console.log(difference, link);
        if (difference < nearest_difference) {
          nearest = link;
          nearest_difference = difference;
        }
      }

      return nearest;
    }
  });

  return StreetViewModule;
});
