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
['config', 'bigl', 'validate', 'stapes', 'socketio'],
function(config, L, validate, Stapes, io) {

  var ViewSyncModule = Stapes.subclass({

    constructor: function(opts) {
      this.master      = opts.master;

      if (validate.number(opts.yawoffset)) {
        this.yawoffset   = opts.yawoffset;
      } else {
        L.error('ViewSync: bad yawoffset to constructor!');
        this.yawoffset = 0;
      }

      if (validate.number(opts.pitchoffset)) {
        this.pitchoffset = opts.pitchoffset;
      } else {
        L.error('ViewSync: bad pitchoffset to constructor!');
        this.pitchoffset = 0;
      }

      this.yawshift    = null;
      this.pitchshift  = null;
      this.origin      = null;
      this.socket      = null;
 //     this.provider    = config.provider -1;
//      this.pano        = config.display.default_pano[config.provider-1];
    },

    // PUBLIC

    // *** resize({hfov, vfov})
    // should be called when the streetview object reports a size change
    resize: function(fov) {
      if (!validate.fov(fov)) {
        L.error('ViewSync: bad fov to resize!');
        return;
      }

      this.yawshift = this.yawoffset * fov.hfov;
      this.pitchshift = this.pitchoffset * fov.vfov;
      if (this.origin !== null) {
        this._applyPov(this._translatePov(this.origin));
      }
    },

    // *** sendPov(google.maps.StreetViewPov)
    // send a view change to the ViewSync relay
    sendPov: function(pov) {
      if (!validate.pov(pov)) {
        L.error('ViewSync: bad pov to sendPov!');
        return;
      }

      this.socket.emit('pov', pov);
    },

    // *** sendPano(panoid)
    // send a pano change to the ViewSync relay
    sendPano: function(panoid) {
      if (!validate.panoid(panoid)) {
        L.error('ViewSync: bad panoid to sendPano!');
        return;
      }
      this.socket.emit('pano', panoid);
      L.info('ViewSync: sendPano', panoid);
    },
    
    // *** sendPvd(pvd)
    // send a pvd change to the ViewSync relay
   /*   sendPvd: function(pvd) {
      console.log('sv_syn.sendPvd');
      if (!validate.pvd(pvd)) {
        L.error('ViewSync: bad provider to sendPano!');
        return;
      }
      L.info('ViewSync: sendPvd', pvd);
      this.socket.emit('pvd',pvd);
    },  
    */
 
    // *** sendMeta(<serialized>google.maps.StreetViewPanoramaData)
    // send new pano meta to the ViewSync relay
    sendMeta: function(data) {
      this.socket.emit('meta', data);
    },

    // *** refresh()
    // request the current state from the relay
    refresh: function() {
      this.socket.emit('refresh');
    },
    
    getParams: function(){
  //    var panopvd = {pano:this.pano, pvd:this.provider};
      this.emit('cur_params',panopvd);
    },

    // *** init()
    // should be called once to start socket communications
    init: function() {
      console.debug( 'ViewSync: init' );

      var self = this;

      this.socket = io.connect('/viewsync');

      this.socket.once('connect', function() {
        console.debug('ViewSync: ready');
        self.emit('ready');
      });
      
      this.socket.on('sync params',function(panopvd){
  //      this.provider = panopvd.pvd;
   //     this.pano = panopvd.pano;
        self._recvParams(panopvd)
      });
      
       this.socket.on('sync pvd', function(pvdid) {
   //     this.provider = pvdid;
        self._recvPvd(pvdid);
      }); 
    
      this.socket.on('sync panopvd', function(panopvd) {   
    //    this.provider = panopvd.pvd;
    //    this.pano = panopvd.pano;
        self._recvPanopvd(panopvd);
      });
      
      this.socket.on('sync pano', function(panoid) {
        if (!validate.panoid(panoid)) {
          L.error('ViewSync: bad panoid from socket!');
          return;
        }
        self._recvPano(panoid);
      });

      this.socket.on('sync pov', function(pov) {
        if (!validate.pov(pov)) {
          L.error('ViewSync: bad pov from socket!');
          return;
        }

        self._recvPov(pov);
      });

      this.socket.on('connect_failed', function() {
        L.error('ViewSync: connect failed!');
      });
      this.socket.on('disconnect', function() {
        L.error('ViewSync: disconnected');
      });
      this.socket.on('reconnect', function() {
        console.debug('ViewSync: reconnected');
      });
    },

    // PRIVATE

    // *** _applyPov(google.maps.StreetViewPov)
    // emits a view change to ViewSync listeners
    _applyPov: function(pov) {
      this.emit('pov_changed', pov);
    },

    // *** _applyPano(panoid)
    // emits a pano change to ViewSync listeners
    _applyPano: function(panoid) {
      this.emit('pano_changed', panoid);
    },
    
    // *** _applyPvd(provider)
    // emits a provider change to ViewSync listeners
    _applyPvd: function(pvdid) {
      this.emit('pvd_changed', pvdid);
    },
    
    // *** _applyPvd(panopvd)
    // emits a provider change to ViewSync listeners
    _applyPanopvd: function(panopvd) {
      this.emit('panopvd_changed', panopvd);
    },
    
    _initParams: function(panopvd){
      this.emit('params_got',panopvd);
    },


    // *** _translatePov(google.maps.StreetViewPov)
    // translate the point of view by local offsets
    _translatePov: function(pov) {
      pov.heading += this.yawshift;
      pov.pitch   += this.pitchshift;
      return pov;
    },

    // *** _recvPov(google.maps.StreetViewPov)
    // unpack and process the pov from a relay message
    _recvPov: function(pov) {
      this._applyPov(this._translatePov(pov));
      this.origin = pov;
    },

    // *** _recvPano(panoid)
    // unpack and process the panoid from a relay message
    _recvPano: function(panoid) {
      this._applyPano(panoid);
    },
    
    _recvPvd: function(pvdid) {
      this._applyPvd(pvdid);
    },
    
    // *** _recvPvd(pvd)
    // unpack and process the provider from a relay message
    _recvPanopvd: function(panopvd) {
      this._applyPanopvd(panopvd);
    },
    
    _recvParams: function(panopvd){
       this._initParams(panopvd);
    }

  });

  return ViewSyncModule;
});
