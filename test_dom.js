var window = this;
window.addEventListener = function(){};
var createEl = function(tag) {
  return { 
    value: "", 
    textContent: "",
    innerHTML: "",
    checked: false,
    classList: { add: function(){}, remove: function(){}, contains: function(){ return false; } }, 
    addEventListener: function(){},
    appendChild: function(){},
    focus: function(){},
    style: {},
    setAttribute: function(){},
    getAttribute: function(){ return ""; },
    closest: function(){ return null; },
    dataset: {}
  };
};
var document = {
  addEventListener: function(e, fn) { 
    if (e === "DOMContentLoaded") {
      print("Calling DOMContentLoaded callback...");
      fn(); 
      print("DOMContentLoaded callback finished successfully!");
    }
  },
  getElementById: function(id) { return createEl(); }, 
  querySelector: function(sel) { return createEl(); },
  querySelectorAll: function(sel) { return []; },
  createElement: createEl
};
var sessionStorage = { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} };
var localStorage = { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} };
var location = { protocol: "http:", search: "" };
var fetch = function() { return Promise.resolve({ ok: true, json: function() { return Promise.resolve({}); } }); };

load("pet_ct_triage/web_app/app.js");
