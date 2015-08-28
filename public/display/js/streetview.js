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
      
      this.provider = null;
      this.pano = null;
      
    },

    // PUBLIC

    // *** init()
    // should be called once when ready to set Maps API into motion
    init: function() {
      console.debug('StreetView: init');

      var self = this;
      
      this.mapArray = new Array(3);
      this.svArray = new Array(3);
      this.sv_svcArray = new Array(3);

      // *** ensure success of Maps API load
      if (typeof XMaps === 'undefined') L.error('Maps API not loaded!');

      // *** initial field-of-view
      this._resize();

      
      // *** create three streetview query object
      this.cvArray = [this.$Gcanvas,this.$Qcanvas,this.$Bcanvas];      
      for(i=0;i<3;i++){
        
        // *** create a local streetview query object
        this.sv_svc = new XMaps[i].StreetViewService();
        this._change_sv_div(i);
        
        // *** options for the map object
        // the map will never be seen, but we can still manipulate the experience
        // with these options.
        this.default_center = new XMaps[i].LatLng(
          config.touchscreen.default_center[i].lat,
          config.touchscreen.default_center[i].lng
        );
              
        // *** options for the streetview object
        var mapOptions = {
          center: this.default_center,
          disableDefaultUI: true,
          backgroundColor: "black",
          zoom: 8
        };
        
              
        var svOptions = {
            visible: true,
            disableDefaultUI: true,
            scrollwheel: false,
            linksControl: false,
            disableCompass: true,
            disableMove: true,
            navigationControl: false
        }; 
        
        // *** only show links on the master display
        if (this.master && config.display.show_links) {
          svOptions.linksControl = true;
          svOptions.disableMove = false;
        }
             
        // *** init map object
        this.map= new XMaps[i].Map(
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
        this.streetview.setPano(config.display.default_pano[i]);
    
        // *** set the display mode as specified in global configuration
        this.streetview.setOptions({ mode: this.mode });
        if (config.display.show_labels) {
          this.streetview.setOptions({'indoorSceneSwitchControl': true});
        }

        // *** apply the custom streetview object to the map
        this.map.setStreetView( this.streetview );
        
        this.mapArray[i] = this.map;
        this.svArray[i] = this.streetview;
        this.sv_svcArray[i] = this.sv_svc;
      }
      
      this.provider = config.provider-1;
      this.streetview = this.svArray[this.provider];
      this.map = this.mapArray[this.provider];
      this.sv_svc = this.sv_svcArray[this.provider];
      this._change_map_shown(this.provider);    
        
             
      // *** events for master only
      if (this.master) {
          
       for(idx = 0; idx<3; idx++){
         self = this;
          // *** handle view change events from the streetview object
         XMaps[idx].addListener(this.svArray[idx], 'pov_changed', function() {            
            var pov = self.streetview.getPov();      
            self._broadcastPov(pov);
            self.pov = pov;
          });

          // *** handle pano change events from the streetview object
         XMaps[idx].addListener(this.svArray[idx], 'pano_changed', function() {   
            var panoid = self.streetview.getPano();          
            if (panoid != self.pano) {
              self._broadcastPano(panoid);
              self.pano = panoid;
              self.resetPov();
            }
          });
        }
      }
            
      
      for(idx = 0; idx<3; idx++){   
        // *** disable <a> tags at the bottom of the canvas
        XMaps[idx].addListenerOnce(this.mapArray[idx], 'idle', function() {
          self._change_sv_div(idx);
          var links = self.$canvas.getElementsByTagName("a");
          var len = links.length;
          for (var i = 0; i < len; i++) {
            links[i].style.display = 'none';
            links[i].onclick = function() {return(false);};
          }
        });

          // *** wait for an idle event before reporting module readiness
        XMaps[idx].addListenerOnce(this.mapArray[idx], 'idle', function() {
            console.debug('StreetView: ready map');
            self.emit('_ready');
        });    
      
      }

      var time = 0
      this.on('_ready', function() {
        time++;
        if(time == 3) this.emit('ready');
      }); 

      // *** request the last known state from the server
      this.on('ready', function() {
        self.emit('refresh');
      });
      
      // *** handle window resizing
      window.addEventListener('resize',  function() {
        self._resize();
      });
            
    },
    
    initParams: function(panopvd){
      this.provider = panopvd.pvd;
      this.pano = panopvd.pano;
      this.svArray[this.provider].setPano(panopvd.pano);
      this.streetview = this.svArray[panopvd.pvd];
      this.emit('init OK');
    },
    
    setPvd: function(pvdid) {
      if (!validate.pvd(pvdid)) {
        L.error('StreetView: bad pvd to setPvd!');
        return;
      }
      if (pvdid != this.provider) {
        this.provider = pvdid;
        this.streetview = this.svArray[pvdid];
        this.map = this.mapArray[pvdid];
        this.sv_svc = this.sv_svcArray[pvdid];
        this._change_map_shown(pvdid);
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
        this.svArray[this.provider] = this.streetview;        
        this.resetPov();
      } else {
        console.warn('StreetView: ignoring redundant setPano');
      }
    },
    
    // *** setPanopvd(provider)
    // switch to the provided provider, immediately
    setPanopvd: function(panopvd) {
      var self = this;      
      var panoid = panopvd.pano;
      var pvdid = panopvd.pvd;
        
      if (pvdid != this.provider) {
        this.provider = pvdid;
        this.pano = panoid;
        this.map = this.mapArray[pvdid];
        
        this.sv_svc = this.sv_svcArray[pvdid];
        this.svArray[pvdid].setPano(panoid);
        this.streetview = this.svArray[pvdid];

        this.resetPov();  
        this._change_map_shown(pvdid);

      }
      else{
        this.pano = panoid;
        this.svArray[pvdid].setPano(panoid);        
        this.streetview = this.svArray[pvdid];
        this.resetPov();
      }

    },    

    // *** setPov(XMaps.StreetViewPov)
    // set the view to the provided pov, immediately
    setPov: function(pov) {
      if (!validate.number(pov.heading) || !validate.number(pov.pitch)) {
        L.error('StreetView: bad pov to setPov!');
        return;
      }
      this.svArray[this.provider].setPov(pov);
      this.streetview = this.svArray[this.provider];
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
      this.svArray[this.provider]=this.streetview;
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
    
    
    _initParam: function(){
      this.emit('sv_init');
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
      this.sv_svcArray[this.provider].getPanoramaById(
        panoid,
        function (data, stat) {
          if (stat == XMaps[self.provider].StreetViewStatus.OK) {
          //sv_svc[self.provider].serializePanoData(data);
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
        if (difference < nearest_difference) {
          nearest = link;
          nearest_difference = difference;
        }
      }

      return nearest;
    },
    
    _change_map_shown:function(pvdid){
      var cvArray = [this.$Gcanvas,this.$Qcanvas,this.$Bcanvas];
      for(i = 0; i<3; i++){
        $curdiv = cvArray[i];
        /*      
        if(i == pvdid) 
          $curdiv.style.display = 'block';
        else $curdiv.style.display = 'none'; 
        */
        
        if(i != pvdid){
          $curdiv.style.height = 0;
          $curdiv.style.opacity = 0;          
        }
        else {
          $curdiv.style.height = "100%";
          $curdiv.style.opacity = 1;
        };
      }
    },
    
    _change_sv_div: function(pvdid){
      if(0==pvdid)   this.$canvas = this.$Gcanvas;
      else if(1==pvdid) this.$canvas = this.$Qcanvas;
      else if(2==pvdid) this.$canvas = this.$Bcanvas;  
    }
  });

  return StreetViewModule;
});
