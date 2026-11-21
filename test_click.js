var window = this;
window.addEventListener = function(){};
var setInterval = function(){ return 1; };
var clearInterval = function(){};
var setTimeout = function(fn){ fn(); };
var elMock = function() {
  return { 
    value: "", 
    textContent: "",
    innerHTML: "",
    checked: false,
    classList: { 
      add: function(c){ print("classList.add: " + c); }, 
      remove: function(c){ print("classList.remove: " + c); }, 
      contains: function(){ return false; } 
    }, 
    addEventListener: function(evt, handler){
      if (this.id === "btn-open-agenda-template") {
        print("btn-open-agenda-template listener registered!");
        this._handler = handler;
      }
    },
    appendChild: function(ch){},
    focus: function(){},
    style: {},
    setAttribute: function(){},
    getAttribute: function(){ return ""; },
    closest: function(){ return null; },
    dataset: {}
  };
};
var elements = {};
var document = {
  addEventListener: function(e, fn) { 
    if (e === "DOMContentLoaded") {
      fn(); 
    }
  },
  getElementById: function(id) { 
    if (!elements[id]) {
      elements[id] = elMock();
      elements[id].id = id;
    }
    return elements[id];
  }, 
  querySelector: function(sel) { return elMock(); },
  querySelectorAll: function(sel) { return []; },
  createElement: function(tag) { return elMock(); }
};
var sessionStorage = { getItem: function(){ return "pet_triage_user_123"; }, setItem: function(){}, removeItem: function(){} };
var localStorage = { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} };
var location = { protocol: "http:", search: "" };
var fetch = function() { return Promise.resolve({ ok: true, json: function() { return Promise.resolve({}); } }); };

load("pet_ct_triage/web_app/app.js");

print("Now testing click on btn-open-agenda-template...");
var btn = document.getElementById("btn-open-agenda-template");
if (btn._handler) {
  btn._handler();
  print("Click handler completed without errors!");
} else {
  print("ERROR: No click handler found on btn-open-agenda-template!");
}
