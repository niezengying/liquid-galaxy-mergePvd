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
['config', 'bigl', 'stapes', 'jquery', 'leftui', 'doT','mergemaps'],
function(config, L, Stapes, $, leftUI, doT, XMaps) {

  var ProvidersModule = Stapes.subclass({
    constructor: function($template) {
      this.template = doT.template($template.innerHTML);
    },

    init: function() {
      console.debug('Providers: init');

      var self = this;

      var providers = config.touchscreen.providers;

      if (providers == null) {
        console.debug('Providers: null or undefined');
        return;
      }

      if (!(providers instanceof Array)) {
        L.error('Providers: not an array');
        return;
      }

      if (providers.length == 0) {
        console.debug('Providers: empty array');
        return;
      }

      var provider_div = this.template(providers);
      
      if(config.touchscreen.show_providers){
        leftUI.append(provider_div);

        $('.providers-item').on('click', function(e) {
          self._clicked(e.target);
        });
      }
    },
            
    _pvdname2id: function(pvdname){
      var providers = config.touchscreen.providers;
      $.each(providers,function(idx,value){
        if(value.app == pvdname)  return idx;
      });
      return 0;
    },

    _clicked: function(provider) {
      var $provider = $(provider);
      var name = $provider.html();
      var pvd  = $provider.attr('app');

      L.info('switching to', name);
      this.emit("switch_provider",pvd);
    }
  });

  return ProvidersModule;
});
