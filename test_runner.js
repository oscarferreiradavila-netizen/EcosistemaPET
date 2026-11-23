var window = this;
window.addEventListener = function(){};
var elMock = function() {
  return { 
    value: '', 
    classList: { add: function(){}, remove: function(){} }, 
    addEventListener: function(){},
    appendChild: function(){},
    focus: function(){},
    style: {} 
  };
};
var document = {
  addEventListener: function(e, fn) {},
  getElementById: function(id) { return elMock(); }, 
  querySelector: function() { return elMock(); },
  querySelectorAll: function() { return []; },
  createElement: function(tag) { return elMock(); }
};
var sessionStorage = { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} };
var localStorage = { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} };
var location = { protocol: 'http:' };
var fetch = function() { return Promise.resolve({ ok: true, json: function() { return Promise.resolve({}); } }); };

load('pet_ct_triage/web_app/app.js');
print('SUCCESS: app.js parsed and executed completely with zero syntax or parse errors!');
