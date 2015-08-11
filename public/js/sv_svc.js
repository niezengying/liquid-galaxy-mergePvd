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

define(['googlemaps','tencentmaps','baidumaps'], function(GMaps,QMaps,BMaps) {
  // provide StreetViewService as a singleton in this module
	
	function StreetViewService(apiProvider){
	  var sv;
	  switch(apiProvider)
	  {
	  case 1:
			sv = new GMaps.StreetViewService();
	    break;
			
	  case 2:		
			sv = new QMaps.PanoramaService();
			sv.getPanoramaById = function(panoid,tencentKey){
				var data = null;
				console.log(panoid);
				if (panoid.match(/^\w+$/)){		
				$.getJSON("http://apis.map.qq.com/ws/streetview/v1/getpano?id="+panoid+"&radius=100&key="+tencentKey+"&output=jsonp&callback=?",
					function(ret) {
					console.log(ret.status);
					if(ret.status == 0){
						//data = {location: {pano:ret.detail.id,latLng: new QMaps.LatLng(ret.detail.location.lat,ret.detail.location.lng),description:ret.detail.description}};
						data = {location: {pano:ret.detail.id,latLng:ret.detail.location,description:ret.detail.description}};
						cb(data,StreetViewStatus.OK);
					}	 
				});
			}};
			
			sv.getPanoramaByLocation = function(position, radius, cb){
				sv.getPano(position,radius,function(ret){
				if(ret !== null){
					data = {location: {pano:ret.id,latLng:ret.latlng,description:ret.description} };
					cb(data,StreetViewStatus.OK);
				}	 
	     });
			};
	    break;
			
	  case 3:
			sv = new BMaps.PanoramaService();
			var tmpsv = new BMaps.PanoramaService();
			sv.getPanoramaById = function(panoid){
				tmpsv.getPanoramaById(panoid,
				function(ret){
					if (ret == null) 	return;  
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
					if (ret == null) 	return;  
					data = {
						location: {pano:ret.id,latLng:ret.position,description:ret.description},
						links:ret.links,
						tiles:ret.tiles
					};
							
					console.log(ret.position);
					console.log(ret.id);
					cb(data,StreetViewStatus.OK);	
				});	
			};	
			break;
		}
	  return sv;
   }
  
	var svByPvd = function(provider){
	var apiProvider = provider+1;
	var sv_svc = StreetViewService(apiProvider);
  // extensions to getPanoramaByLocation:
  // optional expansion to max_radius
  // pass original search latlng to the callback
  function getPanoramaByLocation(latlng, radius, cb, max_radius) {
    var search_opts = {
      latlng: latlng,
      radius: radius,
      max_radius: max_radius || radius,
      cb: cb
    };

    sv_svc.getPanoramaByLocation(
      latlng,
      radius,
      expandingCB.bind(search_opts)
    );
  }

  // recursive callback for expanding search
  function expandingCB(data, stat) {
    if (stat == GMaps.StreetViewStatus.OK) {
      // success
      this.cb(data, stat, this.latlng);

    } else if (this.radius < this.max_radius) {
      // expand the search
      this.radius *= 2;
      if (this.radius > this.max_radius)
        this.radius = this.max_radius;

      getPanoramaByLocation(
        this.latlng,
        this.radius,
        this.cb,
        this.max_radius
      );

    } else {
      // failure
      this.cb(data, stat, this.latlng);
    }

    // explicit cleanup
    delete this;
  }
	
	
  // make StreetViewPanoramaData friendlier
  function serializePanoData(panoData) {
    panoData.location.latLng = GMaps.LatLng({
	  lat: panoData.location.latLng.lat(),
	  lng: panoData.location.latLng.lng()
    });
  }
	

  return{
    // passthrough ID search
    getPanoramaById: sv_svc.getPanoramaById,
	
    // use our wrapped location search
    getPanoramaByLocation: getPanoramaByLocation,

    serializePanoData: serializePanoData
	};
	
	};
	
	var sv_svcs = new Array(3); 
	
	for(i = 0; i<3;i++){
		sv_svcs[i] = svByPvd(i);
	}
	return sv_svcs;
	
	});
