window.open-defuser.js application/javascript
(function(){"use strict";let e="{{1}}";if("{{1}}"===e)e="";let t="{{2}}";if("{{2}}"===t)t="";let n="{{3}}";if("{{3}}"===n)n="";const o=/\blog\b/.test(n)?console.log.bind(console):()=>{};const s=false===/^[01]?$/.test(e);let i="";let r=true;let l=-1;if(s){i=e;if(i.startsWith("!")){r=false;i=i.slice(1)}l=parseInt(t);if(isNaN(l))l=-1}else{i=t;if("0"===e)r=false}if(""===i)i=".?";else if(/^\/.+\/$/.test(i))i=i.slice(1,-1);else i=i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const f=new RegExp(i);const c=function(e,t,n){const o=document.createElement(e);o[t]=n;o.style.setProperty("height","1px","important");o.style.setProperty("position","fixed","important");o.style.setProperty("top","-1px","important");o.style.setProperty("width","1px","important");document.body.appendChild(o);setTimeout((()=>o.remove()),1e3*l);return o};window.open=new Proxy(window.open,{apply:function(e,t,s){o("window.open:",...s);const i=s[0];if(f.test(i)!==r)return e.apply(t,s);if(l<0)return null;const p=/\bobj\b/.test(n)?c("object","data",i):c("iframe","src",i);let u=p.contentWindow;if("object"===typeof u&&null!==u)Object.defineProperty(u,"closed",{value:false});else{const e=function(){}.bind(self);u=new Proxy(self,{get:function(t,n){if("closed"===n)return false;const o=Reflect.get(...arguments);if("function"===typeof o)return e;return t[n]},set:function(){return Reflect.set(...arguments)}})}if(/\blog\b/.test(n))u=new Proxy(u,{get:function(e,t){o("window.open / get",t,"===",e[t]);return Reflect.get(...arguments)},set:function(e,t,n){o("window.open / set",t,"=",n);return Reflect.set(...arguments)}});return u}})})();


window.name-defuser application/javascript
(function(){if(window===window.top)window.name=""})();


widgets.outbrain.com/outbrain.js application/javascript
(function(){"use strict";const e=function(){};const r={};const c=["callClick","callLoadMore","callRecs","callUserZapping","callWhatIs","cancelRecommendation","cancelRecs","closeCard","closeModal","closeTbx","errorInjectionHandler","getCountOfRecs","getStat","imageError","manualVideoClicked","onOdbReturn","onVideoClick","pagerLoad","recClicked","refreshSpecificWidget","refreshWidget","reloadWidget","researchWidget","returnedError","returnedHtmlData","returnedIrdData","returnedJsonData","scrollLoad","showDescription","showRecInIframe","userZappingMessage","zappingFormAction"];r.extern={video:{getVideoRecs:e,videoClicked:e}};c.forEach((function(c){r.extern[c]=e}));window.OBR=window.OBR||r})();


webrtc-if.js application/javascript
(function(){let e="{{1}}";if(e.startsWith("/")&&e.endsWith("/"))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");let t;try{t=new RegExp(e)}catch(e){return}const n=window.RTCPeerConnection?"RTCPeerConnection":window.webkitRTCPeerConnection?"webkitRTCPeerConnection":"";if(""===n)return;const r=console.log.bind(console);const o=new WeakSet;const s=function(e,n){if(o.has(e))return false;if(n instanceof Object===false)return true;if(false===Array.isArray(n.iceServers))return true;for(const e of n.iceServers){const n="string"===typeof e.urls?[e.urls]:e.urls;if(Array.isArray(n))for(const e of n)if(t.test(e))return true;if("string"===typeof e.username)if(t.test(e.username))return true;if("string"===typeof e.credential)if(t.test(e.credential))return true}o.add(e);return false};const c=window[n];const i=c.prototype;i.createDataChannel=new Proxy(i.createDataChannel,{apply:function(e,t,n){if(false===s(e,n[1])){r("uBO:",n[1]);return Reflect.apply(e,t,n.slice(0,1))}return Reflect.apply(e,t,n)}});window[n]=new Proxy(c,{construct:function(e,t){if(false===s(e,t[0])){r("uBO:",t[0]);return Reflect.construct(e)}return Reflect.construct(e,t)}})})();


upmanager-defuser.js application/javascript
(function(){var n=window.onerror;window.onerror=function(o,r,e,i,t){if("string"===typeof o&&-1!==o.indexOf("upManager"))return true;if(n instanceof Function)n.call(window,o,r,e,i,t)};Object.defineProperty(window,"upManager",{value:function(){}})})();


twitch-videoad.js application/javascript
(function(){if(false===/(^|\.)twitch\.tv$/.test(document.location.hostname))return;window.fetch=new Proxy(window.fetch,{apply:function(e,t,n){const[c,i]=n;if("string"===typeof c&&c.includes("gql")&&i instanceof Object&&i.headers instanceof Object&&"string"===typeof i.body&&i.body.includes("PlaybackAccessToken")&&false===i.body.includes('"isVod":true')){const{headers:e}=i;if("string"===typeof e["X-Device-Id"])e["X-Device-Id"]="twitch-web-wall-mason";if("string"===typeof e["Device-ID"])e["Device-ID"]="twitch-web-wall-mason"}return Reflect.apply(e,t,n)}})})();


static.chartbeat.com/chartbeat.js application/javascript
(function(){"use strict";const t=function(){};window.pSUPERFLY={activity:t,virtualPage:t}})();


smartadserver.com.js application/javascript
(function(){Object.defineProperties(window,{SmartAdObject:{value:function(){}},SmartAdServerAjax:{value:function(){}},smartAd:{value:{LoadAds:function(){},Register:function(){}}}})})();


silent-noeval.js application/javascript
(function(){"use strict";window.eval=new Proxy(window.eval,{apply:function(){}})})();


setTimeout-defuser.js application/javascript
(function(){let e="{{1}}";const i="!"===e.charAt(0);if(i)e=e.slice(1);let t="{{2}}";if("{{2}}"===t)t=void 0;let s=false;if(void 0!==t){s="!"===t.charAt(0);if(s)t=t.slice(1);t=parseInt(t,10)}if(""===e||"{{1}}"===e)e="";else if(e.startsWith("/")&&e.endsWith("/"))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const o=false===i&&""===e&&void 0===t?console.log:void 0;const n=new RegExp(e);window.setTimeout=new Proxy(window.setTimeout,{apply:function(l,f,c){const a=String(c[0]);const d=c[1];if(void 0!==o)o('uBO: setTimeout("%s", %s)',a,d);else{let o;if(""!==e)o=n.test(a)!==i;if(false!==o&&void 0!==t)o=(d===t||isNaN(d)&&isNaN(t))!==s;if(o)c[0]=function(){}}return l.apply(f,c)}})})();


set.js application/javascript
(function(){const e="{{1}}";let t="{{2}}";const n=document.currentScript;if("undefined"===t)t=void 0;else if("false"===t)t=false;else if("true"===t)t=true;else if("null"===t)t=null;else if("''"===t)t="";else if("[]"===t)t=[];else if("{}"===t)t={};else if("noopFunc"===t)t=function(){};else if("trueFunc"===t)t=function(){return true};else if("falseFunc"===t)t=function(){return false};else if(/^\d+$/.test(t)){t=parseFloat(t);if(isNaN(t))return;if(Math.abs(t)>32767)return}else return;let i=false;const r=function(e){if(i)return true;i=void 0!==e&&null!==e&&void 0!==t&&null!==t&&typeof e!==typeof t;return i};const f=function(e,n,i,r){if(false===r.init(e[n]))return;const f=Object.getOwnPropertyDescriptor(e,n);let u,s;if(f instanceof Object){e[n]=t;if(f.get instanceof Function)u=f.get;if(f.set instanceof Function)s=f.set}try{Object.defineProperty(e,n,{configurable:i,get(){if(void 0!==u)u();return r.getter()},set(e){if(void 0!==s)s(e);r.setter(e)}})}catch(e){}};const u=function(e,i){const s=i.indexOf(".");if(-1===s){f(e,i,false,{v:void 0,init:function(e){if(r(e))return false;this.v=e;return true},getter:function(){return document.currentScript===n?this.v:t},setter:function(e){if(false===r(e))return;t=e}});return}const c=i.slice(0,s);const o=e[c];i=i.slice(s+1);if(o instanceof Object||"object"===typeof o&&null!==o){u(o,i);return}f(e,c,true,{v:void 0,init:function(e){this.v=e;return true},getter:function(){return this.v},setter:function(e){this.v=e;if(e instanceof Object)u(e,i)}})};u(window,e)})();


set-constant.js application/javascript
(function(){const e="{{1}}";let t="{{2}}";const n=document.currentScript;if("undefined"===t)t=void 0;else if("false"===t)t=false;else if("true"===t)t=true;else if("null"===t)t=null;else if("''"===t)t="";else if("[]"===t)t=[];else if("{}"===t)t={};else if("noopFunc"===t)t=function(){};else if("trueFunc"===t)t=function(){return true};else if("falseFunc"===t)t=function(){return false};else if(/^\d+$/.test(t)){t=parseFloat(t);if(isNaN(t))return;if(Math.abs(t)>32767)return}else return;let i=false;const r=function(e){if(i)return true;i=void 0!==e&&null!==e&&void 0!==t&&null!==t&&typeof e!==typeof t;return i};const f=function(e,n,i,r){if(false===r.init(e[n]))return;const f=Object.getOwnPropertyDescriptor(e,n);let u,s;if(f instanceof Object){e[n]=t;if(f.get instanceof Function)u=f.get;if(f.set instanceof Function)s=f.set}try{Object.defineProperty(e,n,{configurable:i,get(){if(void 0!==u)u();return r.getter()},set(e){if(void 0!==s)s(e);r.setter(e)}})}catch(e){}};const u=function(e,i){const s=i.indexOf(".");if(-1===s){f(e,i,false,{v:void 0,init:function(e){if(r(e))return false;this.v=e;return true},getter:function(){return document.currentScript===n?this.v:t},setter:function(e){if(false===r(e))return;t=e}});return}const c=i.slice(0,s);const o=e[c];i=i.slice(s+1);if(o instanceof Object||"object"===typeof o&&null!==o){u(o,i);return}f(e,c,true,{v:void 0,init:function(e){this.v=e;return true},getter:function(){return this.v},setter:function(e){this.v=e;if(e instanceof Object)u(e,i)}})};u(window,e)})();


scorecardresearch_beacon.js application/javascript
(function(){"use strict";window.COMSCORE={purge:function(){window._comscore=[]},beacon:function(){}}})();


scorecardresearch.com/beacon.js application/javascript
(function(){"use strict";window.COMSCORE={purge:function(){window._comscore=[]},beacon:function(){}}})();


remove-class.js application/javascript
(function(){const e="{{1}}";if(""===e||"{{1}}"===e)return;const t=e.split(/\s*\|\s*/);let o="{{2}}";if(""===o||"{{2}}"===o)o="."+t.map((e=>CSS.escape(e))).join(",.");let s="{{3}}";let n;const r=function(){n=void 0;try{const e=document.querySelectorAll(o);for(const o of e)o.classList.remove(...t)}catch(e){}};const l=e=>{if(void 0!==n)return;let t=true;for(let o=0;o<e.length&&t;o++){const{type:s,addedNodes:n,removedNodes:r}=e[o];if("attributes"===s)t=false;for(let e=0;e<n.length&&t;e++)if(1===n[e].nodeType){t=false;break}for(let e=0;e<r.length&&t;e++)if(1===r[e].nodeType){t=false;break}}if(t)return;n=self.requestIdleCallback(r,{timeout:67})};const a=()=>{r();if(false===/\bstay\b/.test(s))return;const e=new MutationObserver(l);e.observe(document,{attributes:true,attributeFilter:["class"],childList:true,subtree:true})};if("complete"!==document.readyState&&/\bcomplete\b/.test(s))self.addEventListener("load",a,{once:true});else if("loading"===document.readyState)self.addEventListener("DOMContentLoaded",a,{once:true});else a()})();


remove-attr.js application/javascript
(function(){const e="{{1}}";if(""===e||"{{1}}"===e)return;const t=e.split(/\s*\|\s*/);let o="{{2}}";if(""===o||"{{2}}"===o)o=`[${t.join("],[")}]`;let r="{{3}}";let s;const n=()=>{s=void 0;try{const e=document.querySelectorAll(o);for(const o of e)for(const e of t)o.removeAttribute(e)}catch(e){}};const l=e=>{if(void 0!==s)return;let t=true;for(let o=0;o<e.length&&t;o++){const{type:r,addedNodes:s,removedNodes:n}=e[o];if("attributes"===r)t=false;for(let e=0;e<s.length&&t;e++)if(1===s[e].nodeType){t=false;break}for(let e=0;e<n.length&&t;e++)if(1===n[e].nodeType){t=false;break}}if(t)return;s=self.requestIdleCallback(n,{timeout:17})};const i=()=>{n();if(false===/\bstay\b/.test(r))return;const e=new MutationObserver(l);e.observe(document,{attributes:true,attributeFilter:t,childList:true,subtree:true})};if("complete"!==document.readyState&&/\bcomplete\b/.test(r))self.addEventListener("load",i,{once:true});else if("loading"!==document.readyState||/\basap\b/.test(r))i();else self.addEventListener("DOMContentLoaded",i,{once:true})})();


refresh-defuser.js application/javascript
(function(){const t="{{1}}";const e=()=>{const e=document.querySelector('meta[http-equiv="refresh" i][content]');if(null===e)return;const n=""===t||"{{1}}"===t?e.getAttribute("content"):t;const o=1e3*Math.max(parseFloat(n)||0,0);setTimeout((()=>{window.stop()}),o)};if("loading"===document.readyState)document.addEventListener("DOMContentLoaded",e,{once:true});else e()})();


rc.js application/javascript
(function(){const e="{{1}}";if(""===e||"{{1}}"===e)return;const t=e.split(/\s*\|\s*/);let o="{{2}}";if(""===o||"{{2}}"===o)o="."+t.map((e=>CSS.escape(e))).join(",.");let s="{{3}}";let n;const r=function(){n=void 0;try{const e=document.querySelectorAll(o);for(const o of e)o.classList.remove(...t)}catch(e){}};const l=e=>{if(void 0!==n)return;let t=true;for(let o=0;o<e.length&&t;o++){const{type:s,addedNodes:n,removedNodes:r}=e[o];if("attributes"===s)t=false;for(let e=0;e<n.length&&t;e++)if(1===n[e].nodeType){t=false;break}for(let e=0;e<r.length&&t;e++)if(1===r[e].nodeType){t=false;break}}if(t)return;n=self.requestIdleCallback(r,{timeout:67})};const a=()=>{r();if(false===/\bstay\b/.test(s))return;const e=new MutationObserver(l);e.observe(document,{attributes:true,attributeFilter:["class"],childList:true,subtree:true})};if("complete"!==document.readyState&&/\bcomplete\b/.test(s))self.addEventListener("load",a,{once:true});else if("loading"===document.readyState)self.addEventListener("DOMContentLoaded",a,{once:true});else a()})();


ra.js application/javascript
(function(){const e="{{1}}";if(""===e||"{{1}}"===e)return;const t=e.split(/\s*\|\s*/);let o="{{2}}";if(""===o||"{{2}}"===o)o=`[${t.join("],[")}]`;let r="{{3}}";let s;const n=()=>{s=void 0;try{const e=document.querySelectorAll(o);for(const o of e)for(const e of t)o.removeAttribute(e)}catch(e){}};const l=e=>{if(void 0!==s)return;let t=true;for(let o=0;o<e.length&&t;o++){const{type:r,addedNodes:s,removedNodes:n}=e[o];if("attributes"===r)t=false;for(let e=0;e<s.length&&t;e++)if(1===s[e].nodeType){t=false;break}for(let e=0;e<n.length&&t;e++)if(1===n[e].nodeType){t=false;break}}if(t)return;s=self.requestIdleCallback(n,{timeout:17})};const i=()=>{n();if(false===/\bstay\b/.test(r))return;const e=new MutationObserver(l);e.observe(document,{attributes:true,attributeFilter:t,childList:true,subtree:true})};if("complete"!==document.readyState&&/\bcomplete\b/.test(r))self.addEventListener("load",i,{once:true});else if("loading"!==document.readyState||/\basap\b/.test(r))i();else self.addEventListener("DOMContentLoaded",i,{once:true})})();


popads.net.js application/javascript
(function(){"use strict";const n=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);const o=window.onerror;window.onerror=function(t,e,r,i,d){if("string"===typeof t&&-1!==t.indexOf(n))return true;if(o instanceof Function)return o(t,e,r,i,d)}.bind();const t=function(){throw n};delete window.PopAds;delete window.popns;Object.defineProperties(window,{PopAds:{set:t},popns:{set:t}})})();


popads.js application/javascript
(function(){"use strict";const n=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);const o=window.onerror;window.onerror=function(t,e,r,i,d){if("string"===typeof t&&-1!==t.indexOf(n))return true;if(o instanceof Function)return o(t,e,r,i,d)}.bind();const t=function(){throw n};delete window.PopAds;delete window.popns;Object.defineProperties(window,{PopAds:{set:t},popns:{set:t}})})();


popads-dummy.js application/javascript
(function(){"use strict";delete window.PopAds;delete window.popns;Object.defineProperties(window,{PopAds:{value:{}},popns:{value:{}}})})();


overlay-buster.js application/javascript
(function(){if(window!==window.top)return;var e;var t=3e4;var n=0;var o=50;var i=function(){var r=document.documentElement,d=document.body,a=Math.min(r.clientWidth,window.innerWidth),m=Math.min(r.clientHeight,window.innerHeight),u=.05*Math.min(a,m),l=document.elementFromPoint(a/2,m/2),c,f;for(;;){if(null===l||null===l.parentNode||l===d)break;c=window.getComputedStyle(l);if(parseInt(c.zIndex,10)>=1e3||"fixed"===c.position){f=l.getBoundingClientRect();if(f.left<=u&&f.top<=u&&a-f.right<=u&&m-f.bottom<u){l.parentNode.removeChild(l);e=Date.now();l=document.elementFromPoint(a/2,m/2);d.style.setProperty("overflow","auto","important");r.style.setProperty("overflow","auto","important");continue}}l=l.parentNode}if(Date.now()-e<t){n=Math.min(n+o,1e3);setTimeout(i,n)}};var r=function(t){if(t)document.removeEventListener(t.type,r);e=Date.now();setTimeout(i,n)};if("loading"===document.readyState)document.addEventListener("DOMContentLoaded",r);else r()})();


outbrain-widget.js application/javascript
(function(){"use strict";const e=function(){};const r={};const c=["callClick","callLoadMore","callRecs","callUserZapping","callWhatIs","cancelRecommendation","cancelRecs","closeCard","closeModal","closeTbx","errorInjectionHandler","getCountOfRecs","getStat","imageError","manualVideoClicked","onOdbReturn","onVideoClick","pagerLoad","recClicked","refreshSpecificWidget","refreshWidget","reloadWidget","researchWidget","returnedError","returnedHtmlData","returnedIrdData","returnedJsonData","scrollLoad","showDescription","showRecInIframe","userZappingMessage","zappingFormAction"];r.extern={video:{getVideoRecs:e,videoClicked:e}};c.forEach((function(c){r.extern[c]=e}));window.OBR=window.OBR||r})();


nowoif.js application/javascript
(function(){"use strict";let e="{{1}}";if("{{1}}"===e)e="";let t="{{2}}";if("{{2}}"===t)t="";let n="{{3}}";if("{{3}}"===n)n="";const o=/\blog\b/.test(n)?console.log.bind(console):()=>{};const s=false===/^[01]?$/.test(e);let i="";let r=true;let l=-1;if(s){i=e;if(i.startsWith("!")){r=false;i=i.slice(1)}l=parseInt(t);if(isNaN(l))l=-1}else{i=t;if("0"===e)r=false}if(""===i)i=".?";else if(/^\/.+\/$/.test(i))i=i.slice(1,-1);else i=i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const f=new RegExp(i);const c=function(e,t,n){const o=document.createElement(e);o[t]=n;o.style.setProperty("height","1px","important");o.style.setProperty("position","fixed","important");o.style.setProperty("top","-1px","important");o.style.setProperty("width","1px","important");document.body.appendChild(o);setTimeout((()=>o.remove()),1e3*l);return o};window.open=new Proxy(window.open,{apply:function(e,t,s){o("window.open:",...s);const i=s[0];if(f.test(i)!==r)return e.apply(t,s);if(l<0)return null;const p=/\bobj\b/.test(n)?c("object","data",i):c("iframe","src",i);let u=p.contentWindow;if("object"===typeof u&&null!==u)Object.defineProperty(u,"closed",{value:false});else{const e=function(){}.bind(self);u=new Proxy(self,{get:function(t,n){if("closed"===n)return false;const o=Reflect.get(...arguments);if("function"===typeof o)return e;return t[n]},set:function(){return Reflect.set(...arguments)}})}if(/\blog\b/.test(n))u=new Proxy(u,{get:function(e,t){o("window.open / get",t,"===",e[t]);return Reflect.get(...arguments)},set:function(e,t,n){o("window.open / set",t,"=",n);return Reflect.set(...arguments)}});return u}})})();


nowebrtc.js application/javascript
(function(){var n=window.RTCPeerConnection?"RTCPeerConnection":window.webkitRTCPeerConnection?"webkitRTCPeerConnection":"";if(""===n)return;var e=console.log.bind(console);var o=function(n){e("Document tried to create an RTCPeerConnection: %o",n)};const t=function(){};o.prototype={close:t,createDataChannel:t,createOffer:t,setRemoteDescription:t,toString:function(){return"[object RTCPeerConnection]"}};var i=window[n];window[n]=o.bind(window);if(i.prototype)i.prototype.createDataChannel=function(){return{close:function(){},send:function(){}}}.bind(null)})();


nostif.js application/javascript
(function(){let e="{{1}}";const i="!"===e.charAt(0);if(i)e=e.slice(1);let t="{{2}}";if("{{2}}"===t)t=void 0;let s=false;if(void 0!==t){s="!"===t.charAt(0);if(s)t=t.slice(1);t=parseInt(t,10)}if(""===e||"{{1}}"===e)e="";else if(e.startsWith("/")&&e.endsWith("/"))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const o=false===i&&""===e&&void 0===t?console.log:void 0;const n=new RegExp(e);window.setTimeout=new Proxy(window.setTimeout,{apply:function(l,f,c){const a=String(c[0]);const d=c[1];if(void 0!==o)o('uBO: setTimeout("%s", %s)',a,d);else{let o;if(""!==e)o=n.test(a)!==i;if(false!==o&&void 0!==t)o=(d===t||isNaN(d)&&isNaN(t))!==s;if(o)c[0]=function(){}}return l.apply(f,c)}})})();


nosiif.js application/javascript
(function(){let e="{{1}}";const i="!"===e.charAt(0);if(i)e=e.slice(1);let t="{{2}}";if("{{2}}"===t)t=void 0;let s=false;if(void 0!==t){s="!"===t.charAt(0);if(s)t=t.slice(1);t=parseInt(t,10)}if(""===e||"{{1}}"===e)e="";else if(e.startsWith("/")&&e.endsWith("/"))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const n=false===i&&""===e&&void 0===t?console.log:void 0;const l=new RegExp(e);window.setInterval=new Proxy(window.setInterval,{apply:function(o,f,a){const c=String(a[0]);const r=a[1];if(void 0!==n)n('uBO: setInterval("%s", %s)',c,r);else{let n;if(""!==e)n=l.test(c)!==i;if(false!==n&&void 0!==t)n=(r===t||isNaN(r)&&isNaN(t))!==s;if(n)a[0]=function(){}}return o.apply(f,a)}})})();


norafif.js application/javascript
(function(){let e="{{1}}";if("{{1}}"===e)e="";const i="!"===e.charAt(0);if(i)e=e.slice(1);if(e.startsWith("/")&&e.endsWith("/"))e=e.slice(1,-1);else if(""!==e)e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const n=false===i&&""===e?console.log:void 0;const t=new RegExp(e);window.requestAnimationFrame=new Proxy(window.requestAnimationFrame,{apply:function(e,s,o){const a=String(o[0]);let l=false;if(void 0!==n)n('uBO: requestAnimationFrame("%s")',a);else l=t.test(a)!==i;if(l)o[0]=function(){};return e.apply(s,o)}})})();


noopvmap-1.0 text/plain
<vmap:VMAP xmlns:vmap="http://www.iab.net/videosuite/vmap" version="1.0"></vmap:VMAP>


noopmp4-1s video/mp4;base64
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


noopmp3-0.1s audio/mp3;base64
SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQwLjEwMQAAAAAAAAAAAAAA//tUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAGAAADAABgYGBgYGBgYGBgYGBgYGBggICAgICAgICAgICAgICAgICgoKCgoKCgoKCgoKCgoKCgwMDAwMDAwMDAwMDAwMDAwMDg4ODg4ODg4ODg4ODg4ODg4P////////////////////8AAAAATGF2YzU2LjYwAAAAAAAAAAAAAAAAJAAAAAAAAAAAAwDNZKlY//sUZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZB4P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZDwP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZFoP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZHgP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZJYP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV


noopjs application/javascript
(function(){"use strict"})();


noopframe text/html
<!DOCTYPE html>
<html>
    <head><title></title></head>
    <body></body>
</html>


noop.js application/javascript
(function(){"use strict"})();


noop.html text/html
<!DOCTYPE html>
<html>
    <head><title></title></head>
    <body></body>
</html>


noop-vmap1.0.xml text/plain
<vmap:VMAP xmlns:vmap="http://www.iab.net/videosuite/vmap" version="1.0"></vmap:VMAP>


noop-1s.mp4 video/mp4;base64
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


noop-0.1s.mp3 audio/mp3;base64
SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQwLjEwMQAAAAAAAAAAAAAA//tUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAGAAADAABgYGBgYGBgYGBgYGBgYGBggICAgICAgICAgICAgICAgICgoKCgoKCgoKCgoKCgoKCgwMDAwMDAwMDAwMDAwMDAwMDg4ODg4ODg4ODg4ODg4ODg4P////////////////////8AAAAATGF2YzU2LjYwAAAAAAAAAAAAAAAAJAAAAAAAAAAAAwDNZKlY//sUZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZB4P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZDwP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZFoP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZHgP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZJYP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV


nofab.js application/javascript
(function(){"use strict";const o=function(){};const e=function(){};e.prototype.check=o;e.prototype.clearEvent=o;e.prototype.emitEvent=o;e.prototype.on=function(o,e){if(!o)e();return this};e.prototype.onDetected=function(){return this};e.prototype.onNotDetected=function(o){o();return this};e.prototype.setOption=o;const n=new e,t={get:function(){return e},set:function(){}},c={get:function(){return n},set:function(){}};if(window.hasOwnProperty("FuckAdBlock"))window.FuckAdBlock=e;else Object.defineProperty(window,"FuckAdBlock",t);if(window.hasOwnProperty("BlockAdBlock"))window.BlockAdBlock=e;else Object.defineProperty(window,"BlockAdBlock",t);if(window.hasOwnProperty("SniffAdBlock"))window.SniffAdBlock=e;else Object.defineProperty(window,"SniffAdBlock",t);if(window.hasOwnProperty("fuckAdBlock"))window.fuckAdBlock=n;else Object.defineProperty(window,"fuckAdBlock",c);if(window.hasOwnProperty("blockAdBlock"))window.blockAdBlock=n;else Object.defineProperty(window,"blockAdBlock",c);if(window.hasOwnProperty("sniffAdBlock"))window.sniffAdBlock=n;else Object.defineProperty(window,"sniffAdBlock",c)})();


noeval.js application/javascript
(function(){"use strict";const n=console.log.bind(console);window.eval=new Proxy(window.eval,{apply:function(o,e,t){n(`Document tried to eval... ${t[0]}\n`)}})})();


noeval-silent.js application/javascript
(function(){"use strict";window.eval=new Proxy(window.eval,{apply:function(){}})})();


noeval-if.js application/javascript
(function(){let e="{{1}}";if(""===e||"{{1}}"===e)e=".?";else if("/"===e.slice(0,1)&&"/"===e.slice(-1))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");e=new RegExp(e);window.eval=new Proxy(window.eval,{apply:function(l,i,n){const t=n[0];if(false===e.test(t.toString()))return l.apply(i,n)}})})();


nobab.js application/javascript
(function(){"use strict";const e=[["blockadblock"],["babasbm"],[/getItem\('babn'\)/],["getElementById","String.fromCharCode","ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789","charAt","DOMContentLoaded","AdBlock","addEventListener","doScroll","fromCharCode","<<2|r>>4","sessionStorage","clientWidth","localStorage","Math","random"]];const t=function(t){for(let n=0;n<e.length;n++){const o=e[n];let r=0;for(let e=0;e<o.length;e++){const n=o[e];const i=n instanceof RegExp?t.search(n):t.indexOf(n);if(-1!==i)r+=1}if(r/o.length>=.8)return true}return false};window.eval=new Proxy(window.eval,{apply:function(e,n,o){const r=o[0];if("string"!==typeof r||!t(r))return e.apply(n,o);if(document.body)document.body.style.removeProperty("visibility");let i=document.getElementById("babasbmsgx");if(i)i.parentNode.removeChild(i)}});window.setTimeout=new Proxy(window.setTimeout,{apply:function(e,t,n){const o=n[0];if("string"!==typeof o||false===/\.bab_elementid.$/.test(o))return e.apply(t,n)}})})();


no-xhr-if.js application/javascript
(function(){const e=new WeakMap;let t="{{1}}";if("{{1}}"===t)t="";const s=[];for(const e of t.split(/\s+/)){if(""===e)continue;const t=e.indexOf(":");let l,n;if(-1!==t){l=e.slice(0,t);n=e.slice(t+1)}else{l="url";n=e}if(""===n)n="^";else if(n.startsWith("/")&&n.endsWith("/"))n=n.slice(1,-1);else n=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");s.push({key:l,re:new RegExp(n)})}const l=0===s.length?console.log.bind(console):void 0;self.XMLHttpRequest=class extends self.XMLHttpRequest{open(...t){if(void 0!==l)l(`uBO: xhr.open(${t.join(", ")})`);else{const l=["method","url"];const n=new Map;for(let e=0;e<t.length&&e<l.length;e++)n.set(l[e],t[e]);if(0!==n.size){let t=true;for(const{key:e,re:l}of s){t=l.test(n.get(e)||"");if(false===t)break}if(t)e.set(this,n)}}return super.open(...t)}send(...t){const s=e.get(this);if(void 0===s)return super.send(...t);Object.defineProperties(this,{readyState:{value:4,writable:false},response:{value:"",writable:false},responseText:{value:"",writable:false},responseURL:{value:s.get("url"),writable:false},responseXML:{value:"",writable:false},status:{value:200,writable:false},statusText:{value:"OK",writable:false}});if(null!==this.onreadystatechange)setTimeout((()=>{const e=new Event("readystatechange");this.onreadystatechange.call(this,e)}),1);if(null!==this.onload)setTimeout((()=>{const e=new Event("load");this.onload.call(this,e)}),1)}}})();


no-setTimeout-if.js application/javascript
(function(){let e="{{1}}";const i="!"===e.charAt(0);if(i)e=e.slice(1);let t="{{2}}";if("{{2}}"===t)t=void 0;let s=false;if(void 0!==t){s="!"===t.charAt(0);if(s)t=t.slice(1);t=parseInt(t,10)}if(""===e||"{{1}}"===e)e="";else if(e.startsWith("/")&&e.endsWith("/"))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const o=false===i&&""===e&&void 0===t?console.log:void 0;const n=new RegExp(e);window.setTimeout=new Proxy(window.setTimeout,{apply:function(l,f,c){const a=String(c[0]);const d=c[1];if(void 0!==o)o('uBO: setTimeout("%s", %s)',a,d);else{let o;if(""!==e)o=n.test(a)!==i;if(false!==o&&void 0!==t)o=(d===t||isNaN(d)&&isNaN(t))!==s;if(o)c[0]=function(){}}return l.apply(f,c)}})})();


no-setInterval-if.js application/javascript
(function(){let e="{{1}}";const i="!"===e.charAt(0);if(i)e=e.slice(1);let t="{{2}}";if("{{2}}"===t)t=void 0;let s=false;if(void 0!==t){s="!"===t.charAt(0);if(s)t=t.slice(1);t=parseInt(t,10)}if(""===e||"{{1}}"===e)e="";else if(e.startsWith("/")&&e.endsWith("/"))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const n=false===i&&""===e&&void 0===t?console.log:void 0;const l=new RegExp(e);window.setInterval=new Proxy(window.setInterval,{apply:function(o,f,a){const c=String(a[0]);const r=a[1];if(void 0!==n)n('uBO: setInterval("%s", %s)',c,r);else{let n;if(""!==e)n=l.test(c)!==i;if(false!==n&&void 0!==t)n=(r===t||isNaN(r)&&isNaN(t))!==s;if(n)a[0]=function(){}}return o.apply(f,a)}})})();


no-requestAnimationFrame-if.js application/javascript
(function(){let e="{{1}}";if("{{1}}"===e)e="";const i="!"===e.charAt(0);if(i)e=e.slice(1);if(e.startsWith("/")&&e.endsWith("/"))e=e.slice(1,-1);else if(""!==e)e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const n=false===i&&""===e?console.log:void 0;const t=new RegExp(e);window.requestAnimationFrame=new Proxy(window.requestAnimationFrame,{apply:function(e,s,o){const a=String(o[0]);let l=false;if(void 0!==n)n('uBO: requestAnimationFrame("%s")',a);else l=t.test(a)!==i;if(l)o[0]=function(){};return e.apply(s,o)}})})();


no-floc.js application/javascript
(function(){if(Document instanceof Object===false)return;if(Document.prototype.interestCohort instanceof Function===false)return;Document.prototype.interestCohort=new Proxy(Document.prototype.interestCohort,{apply:function(){return Promise.reject()}})})();


no-fetch-if.js application/javascript
(function(){let e="{{1}}";if("{{1}}"===e)e="";const t=[];for(const s of e.split(/\s+/)){if(""===s)continue;const e=s.indexOf(":");let n,i;if(-1!==e){n=s.slice(0,e);i=s.slice(e+1)}else{n="url";i=s}if(""===i)i="^";else if(i.startsWith("/")&&i.endsWith("/"))i=i.slice(1,-1);else i=i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");t.push({key:n,re:new RegExp(i)})}const s=0===t.length?console.log.bind(console):void 0;self.fetch=new Proxy(self.fetch,{apply:function(e,n,i){let o=true;try{let e;if(i[0]instanceof self.Request)e=i[0];else e=Object.assign({url:i[0]},i[1]);const n=new Map;for(const t in e){let s=e[t];if("string"!==typeof s)try{s=JSON.stringify(s)}catch(e){}if("string"!==typeof s)continue;n.set(t,s)}if(void 0!==s){const e=Array.from(n).map((e=>`${e[0]}:${e[1]}`)).join(" ");s(`uBO: fetch(${e})`)}o=0===t.length;for(const{key:e,re:s}of t)if(false===n.has(e)||false===s.test(n.get(e))){o=true;break}}catch(e){}return o?Reflect.apply(e,n,i):Promise.resolve(new Response)}})})();


nano-stb.js application/javascript
(function(){let e="{{1}}";if("{{1}}"===e)e="";let t="{{2}}";if("{{2}}"===t)t="";let i="{{3}}";if("{{3}}"===i)i="";if(""===e)e=".?";else if("/"===e.charAt(0)&&"/"===e.slice(-1))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const s=new RegExp(e);let l="*"!==t?parseInt(t,10):-1;if(isNaN(l)||false===isFinite(l))l=1e3;let a=parseFloat(i);a=false===isNaN(a)&&isFinite(a)?Math.min(Math.max(a,.02),50):.05;self.setTimeout=new Proxy(self.setTimeout,{apply:function(e,t,i){const[n,f]=i;if((-1===l||f===l)&&s.test(n.toString()))i[1]=f*a;return e.apply(t,i)}})})();


nano-sib.js application/javascript
(function(){let e="{{1}}";if("{{1}}"===e)e="";let t="{{2}}";if("{{2}}"===t)t="";let i="{{3}}";if("{{3}}"===i)i="";if(""===e)e=".?";else if("/"===e.charAt(0)&&"/"===e.slice(-1))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const l=new RegExp(e);let s="*"!==t?parseInt(t,10):-1;if(isNaN(s)||false===isFinite(s))s=1e3;let a=parseFloat(i);a=false===isNaN(a)&&isFinite(a)?Math.min(Math.max(a,.02),50):.05;self.setInterval=new Proxy(self.setInterval,{apply:function(e,t,i){const[n,f]=i;if((-1===s||f===s)&&l.test(n.toString()))i[1]=f*a;return e.apply(t,i)}})})();


nano-setTimeout-booster.js application/javascript
(function(){let e="{{1}}";if("{{1}}"===e)e="";let t="{{2}}";if("{{2}}"===t)t="";let i="{{3}}";if("{{3}}"===i)i="";if(""===e)e=".?";else if("/"===e.charAt(0)&&"/"===e.slice(-1))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const s=new RegExp(e);let l="*"!==t?parseInt(t,10):-1;if(isNaN(l)||false===isFinite(l))l=1e3;let a=parseFloat(i);a=false===isNaN(a)&&isFinite(a)?Math.min(Math.max(a,.02),50):.05;self.setTimeout=new Proxy(self.setTimeout,{apply:function(e,t,i){const[n,f]=i;if((-1===l||f===l)&&s.test(n.toString()))i[1]=f*a;return e.apply(t,i)}})})();


nano-setInterval-booster.js application/javascript
(function(){let e="{{1}}";if("{{1}}"===e)e="";let t="{{2}}";if("{{2}}"===t)t="";let i="{{3}}";if("{{3}}"===i)i="";if(""===e)e=".?";else if("/"===e.charAt(0)&&"/"===e.slice(-1))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const l=new RegExp(e);let s="*"!==t?parseInt(t,10):-1;if(isNaN(s)||false===isFinite(s))s=1e3;let a=parseFloat(i);a=false===isNaN(a)&&isFinite(a)?Math.min(Math.max(a,.02),50):.05;self.setInterval=new Proxy(self.setInterval,{apply:function(e,t,i){const[n,f]=i;if((-1===s||f===s)&&l.test(n.toString()))i[1]=f*a;return e.apply(t,i)}})})();


monkeybroker.js application/javascript
(function(){"use strict";const o=function(){};window.pbjs={libLoaded:true};const t=window.MonkeyBroker||{addAttribute:o,addSlot:function(o){this.slots[o.slot]={}},defineSlot:o,fillSlot:o,go:o,inventoryConditionalPlacement:o,registerSizeCallback:o,registerSlotCallback:o,slots:{},version:""};t.regSlotsMap=t.slots;window.MonkeyBroker=t})();


ligatus_angular-tag.js application/javascript
(function(){"use strict";self.adProtect=true;Object.defineProperties(window,{uabpdl:{value:true},uabDetect:{value:true}})})();


ligatus.com/*/angular-tag.js application/javascript
(function(){"use strict";self.adProtect=true;Object.defineProperties(window,{uabpdl:{value:true},uabDetect:{value:true}})})();


json-prune.js application/javascript
(function(){const e="{{1}}";const t="{{2}}";const n="{{1}}"!==e&&""!==e?e.split(/ +/):[];let o;let s,r;if(0!==n.length)o=0!==n.length&&"{{2}}"!==t&&""!==t?t.split(/ +/):[];else{s=console.log.bind(console);let e;if(""===t||"{{2}}"===t)e=".?";else if("/"===t.charAt(0)&&"/"===t.slice(-1))e=t.slice(1,-1);else e=t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");r=new RegExp(e)}const l=function(e,t,n=false){let o=e;let s=t;for(;;){if("object"!==typeof o||null===o)return false;const e=s.indexOf(".");if(-1===e){if(false===n)return o.hasOwnProperty(s);if("*"===s)for(const e in o){if(false===o.hasOwnProperty(e))continue;delete o[e]}else if(o.hasOwnProperty(s))delete o[s];return true}const t=s.slice(0,e);if("[]"===t&&Array.isArray(o)||"*"===t&&o instanceof Object){const t=s.slice(e+1);let r=false;for(const e of Object.keys(o))r=l(o[e],t,n)||r;return r}if(false===o.hasOwnProperty(t))return false;o=o[t];s=s.slice(e+1)}};const f=function(e){for(const t of o)if(false===l(e,t))return false;return true};const i=function(e){if(void 0!==s){const t=JSON.stringify(e,null,2);if(r.test(t))s("uBO:",location.hostname,t);return e}if(false===f(e))return e;for(const t of n)l(e,t,true);return e};JSON.parse=new Proxy(JSON.parse,{apply:function(){return i(Reflect.apply(...arguments))}});Response.prototype.json=new Proxy(Response.prototype.json,{apply:function(){return Reflect.apply(...arguments).then((e=>i(e)))}})})();


hd-main.js application/javascript
(function(){"use strict";const e={};const d=function(){};const f=["$j","Ad","Bd","Cd","Dd","Ed","Fd","Gd","Hd","Id","Jd","Nj","Oc","Pc","Pe","Qc","Qe","Rc","Re","Ri","Sc","Tc","Uc","Vc","Wc","Wg","Xc","Xg","Yc","Yd","ad","ae","bd","bf","cd","dd","ed","ef","ek","fd","fg","fh","fk","gd","hd","ig","ij","jd","kd","ke","ld","md","mi","nd","od","oh","pd","pf","qd","rd","sd","td","ud","vd","wd","wg","xd","xh","yd","zd","$d","$e","$k","Ae","Af","Aj","Be","Ce","De","Ee","Ek","Eo","Ep","Fe","Fo","Ge","Gh","Hk","Ie","Ip","Je","Ke","Kk","Kq","Le","Lh","Lk","Me","Mm","Ne","Oe","Pe","Qe","Re","Rp","Se","Te","Ue","Ve","Vp","We","Xd","Xe","Yd","Ye","Zd","Ze","Zf","Zk","ae","af","al","be","bf","bg","ce","cp","df","di","ee","ef","fe","ff","gf","gm","he","hf","ie","je","jf","ke","kf","kl","le","lf","lk","mf","mg","mn","nf","oe","of","pe","pf","pg","qe","qf","re","rf","se","sf","te","tf","ti","ue","uf","ve","vf","we","wf","wg","wi","xe","ye","yf","yk","yl","ze","zf","zk"];for(let c=0;c<f.length;c++)e[f[c]]=d;window.L=window.J=e})();


gpt-defuser.js application/javascript
(function(){const e=function(){};let t="_resetGPT resetGPT resetAndLoadGPTRecovery _resetAndLoadGPTRecovery setupGPT setupGPTuo";t=t.split(/\s+/);while(t.length){var n=t.pop();if("function"===typeof window[n])window[n]=e;else Object.defineProperty(window,n,{get:function(){return e},set:e})}})();


googletagservices_gpt.js application/javascript
(function(){"use strict";const e=function(){}.bind();const t=function(){return this};const n=function(){return null};const i=function(){return[]};const o=function(){return""};const s={addEventListener:t,enableSyncLoading:e,setRefreshUnfilledSlots:e};const r={addEventListener:t,setContent:e};const a=function(){};let c=a.prototype;c.display=e;c.get=n;c.set=t;c.setClickUrl=t;c.setTagForChildDirectedTreatment=t;c.setTargeting=t;c.updateTargetingFromMap=t;const g={addEventListener:t,clear:e,clearCategoryExclusions:t,clearTagForChildDirectedTreatment:t,clearTargeting:t,collapseEmptyDivs:e,defineOutOfPagePassback:function(){return new a},definePassback:function(){return new a},disableInitialLoad:e,display:e,enableAsyncRendering:e,enableSingleRequest:e,enableSyncRendering:e,enableVideoAds:e,get:n,getAttributeKeys:i,getTargeting:e,getTargetingKeys:i,getSlots:i,refresh:e,set:t,setCategoryExclusion:t,setCentering:e,setCookieOptions:t,setForceSafeFrame:t,setLocation:t,setPublisherProvidedId:t,setRequestNonPersonalizedAds:t,setSafeFrameConfig:t,setTagForChildDirectedTreatment:t,setTargeting:t,setVideoContent:t,updateCorrelator:e};const d=function(){};c=d.prototype;c.addSize=t;c.build=n;const l=function(){};c=l.prototype;c.addService=t;c.clearCategoryExclusions=t;c.clearTargeting=t;c.defineSizeMapping=t;c.get=n;c.getAdUnitPath=i;c.getAttributeKeys=i;c.getCategoryExclusions=i;c.getDomId=o;c.getResponseInformation=n;c.getSlotElementId=o;c.getSlotId=t;c.getTargeting=i;c.getTargetingKeys=i;c.set=t;c.setCategoryExclusion=t;c.setClickUrl=t;c.setCollapseEmptyDiv=t;c.setTargeting=t;const u=window.googletag||{};const f=u.cmd||[];u.apiReady=true;u.cmd=[];u.cmd.push=function(e){try{e()}catch(e){}return 1};u.companionAds=function(){return s};u.content=function(){return r};u.defineOutOfPageSlot=function(){return new l};u.defineSlot=function(){return new l};u.destroySlots=e;u.disablePublisherConsole=e;u.display=e;u.enableServices=e;u.getVersion=o;u.pubads=function(){return g};u.pubadsReady=true;u.setAdIframeTitle=e;u.sizeMapping=function(){return new d};window.googletag=u;while(0!==f.length)u.cmd.push(f.shift())})();


googletagservices.com/gpt.js application/javascript
(function(){"use strict";const e=function(){}.bind();const t=function(){return this};const n=function(){return null};const i=function(){return[]};const o=function(){return""};const s={addEventListener:t,enableSyncLoading:e,setRefreshUnfilledSlots:e};const r={addEventListener:t,setContent:e};const a=function(){};let c=a.prototype;c.display=e;c.get=n;c.set=t;c.setClickUrl=t;c.setTagForChildDirectedTreatment=t;c.setTargeting=t;c.updateTargetingFromMap=t;const g={addEventListener:t,clear:e,clearCategoryExclusions:t,clearTagForChildDirectedTreatment:t,clearTargeting:t,collapseEmptyDivs:e,defineOutOfPagePassback:function(){return new a},definePassback:function(){return new a},disableInitialLoad:e,display:e,enableAsyncRendering:e,enableSingleRequest:e,enableSyncRendering:e,enableVideoAds:e,get:n,getAttributeKeys:i,getTargeting:e,getTargetingKeys:i,getSlots:i,refresh:e,set:t,setCategoryExclusion:t,setCentering:e,setCookieOptions:t,setForceSafeFrame:t,setLocation:t,setPublisherProvidedId:t,setRequestNonPersonalizedAds:t,setSafeFrameConfig:t,setTagForChildDirectedTreatment:t,setTargeting:t,setVideoContent:t,updateCorrelator:e};const d=function(){};c=d.prototype;c.addSize=t;c.build=n;const l=function(){};c=l.prototype;c.addService=t;c.clearCategoryExclusions=t;c.clearTargeting=t;c.defineSizeMapping=t;c.get=n;c.getAdUnitPath=i;c.getAttributeKeys=i;c.getCategoryExclusions=i;c.getDomId=o;c.getResponseInformation=n;c.getSlotElementId=o;c.getSlotId=t;c.getTargeting=i;c.getTargetingKeys=i;c.set=t;c.setCategoryExclusion=t;c.setClickUrl=t;c.setCollapseEmptyDiv=t;c.setTargeting=t;const u=window.googletag||{};const f=u.cmd||[];u.apiReady=true;u.cmd=[];u.cmd.push=function(e){try{e()}catch(e){}return 1};u.companionAds=function(){return s};u.content=function(){return r};u.defineOutOfPageSlot=function(){return new l};u.defineSlot=function(){return new l};u.destroySlots=e;u.disablePublisherConsole=e;u.display=e;u.enableServices=e;u.getVersion=o;u.pubads=function(){return g};u.pubadsReady=true;u.setAdIframeTitle=e;u.sizeMapping=function(){return new d};window.googletag=u;while(0!==f.length)u.cmd.push(f.shift())})();


googletagmanager_gtm.js application/javascript
(function(){"use strict";const n=function(){};const t=window;t.ga=t.ga||n;const e=t.dataLayer;if(e instanceof Object===false)return;if(e.hide instanceof Object&&"function"===typeof e.hide.end)e.hide.end();if("function"===typeof e.push)e.push=function(n){if(n instanceof Object&&"function"===typeof n.eventCallback)setTimeout(n.eventCallback,1)}})();


googletagmanager.com/gtm.js application/javascript
(function(){"use strict";const n=function(){};const t=window;t.ga=t.ga||n;const e=t.dataLayer;if(e instanceof Object===false)return;if(e.hide instanceof Object&&"function"===typeof e.hide.end)e.hide.end();if("function"===typeof e.push)e.push=function(n){if(n instanceof Object&&"function"===typeof n.eventCallback)setTimeout(n.eventCallback,1)}})();


googlesyndication_adsbygoogle.js application/javascript
(function(){"use strict";window.adsbygoogle={loaded:true,push:function(){}};const t=document.querySelectorAll(".adsbygoogle");const e="height:1px!important;max-height:1px!important;max-width:1px!important;width:1px!important;";for(let o=0;o<t.length;o++){const n=`aswift_${o}`;if(null!==document.querySelector(`iframe#${n}`))continue;const i=document.createElement("iframe");i.id=n;i.style=e;const a=document.createElement("iframe");a.id=`google_ads_frame${o}`;i.appendChild(a);t[o].appendChild(i)}})();


googlesyndication.com/adsbygoogle.js application/javascript
(function(){"use strict";window.adsbygoogle={loaded:true,push:function(){}};const t=document.querySelectorAll(".adsbygoogle");const e="height:1px!important;max-height:1px!important;max-width:1px!important;width:1px!important;";for(let o=0;o<t.length;o++){const n=`aswift_${o}`;if(null!==document.querySelector(`iframe#${n}`))continue;const i=document.createElement("iframe");i.id=n;i.style=e;const a=document.createElement("iframe");a.id=`google_ads_frame${o}`;i.appendChild(a);t[o].appendChild(i)}})();


google-analytics_inpage_linkid.js application/javascript
(function(){"use strict";window._gaq=window._gaq||{push:function(){}}})();


google-analytics_ga.js application/javascript
(function(){"use strict";const t=function(){};const e=function(){};e.prototype.Na=t;e.prototype.O=t;e.prototype.Sa=t;e.prototype.Ta=t;e.prototype.Va=t;e.prototype._createAsyncTracker=t;e.prototype._getAsyncTracker=t;e.prototype._getPlugin=t;e.prototype.push=function(t){if("function"===typeof t){t();return}if(false===Array.isArray(t))return;if("string"===typeof t[0]&&/(^|\.)_link$/.test(t[0])&&"string"===typeof t[1])try{window.location.assign(t[1])}catch(t){}if("_set"===t[0]&&"hitCallback"===t[1]&&"function"===typeof t[2])t[2]()};const o=(function(){const e={};const o=["_addIgnoredOrganic _addIgnoredRef _addItem _addOrganic","_addTrans _clearIgnoredOrganic _clearIgnoredRef _clearOrganic","_cookiePathCopy _deleteCustomVar _getName _setAccount","_getAccount _getClientInfo _getDetectFlash _getDetectTitle","_getLinkerUrl _getLocalGifPath _getServiceMode _getVersion","_getVisitorCustomVar _initData _linkByPost","_setAllowAnchor _setAllowHash _setAllowLinker _setCampContentKey","_setCampMediumKey _setCampNameKey _setCampNOKey _setCampSourceKey","_setCampTermKey _setCampaignCookieTimeout _setCampaignTrack _setClientInfo","_setCookiePath _setCookiePersistence _setCookieTimeout _setCustomVar","_setDetectFlash _setDetectTitle _setDomainName _setLocalGifPath","_setLocalRemoteServerMode _setLocalServerMode _setReferrerOverride _setRemoteServerMode","_setSampleRate _setSessionTimeout _setSiteSpeedSampleRate _setSessionCookieTimeout","_setVar _setVisitorCookieTimeout _trackEvent _trackPageLoadTime","_trackPageview _trackSocial _trackTiming _trackTrans","_visitCode"].join(" ").split(/\s+/);for(const r of o)e[r]=t;e._getLinkerUrl=function(t){return t};e._link=function(t){if("string"!==typeof t)return;try{window.location.assign(t)}catch(t){}};return e})();const r=function(){};r.prototype._anonymizeIP=t;r.prototype._createTracker=t;r.prototype._forceSSL=t;r.prototype._getPlugin=t;r.prototype._getTracker=function(){return o};r.prototype._getTrackerByName=function(){return o};r.prototype._getTrackers=t;r.prototype.aa=t;r.prototype.ab=t;r.prototype.hb=t;r.prototype.la=t;r.prototype.oa=t;r.prototype.pa=t;r.prototype.u=t;const n=new r;window._gat=n;const a=new e;(function(){const t=window._gaq||[];if(Array.isArray(t))while(t[0])a.push(t.shift())})();window._gaq=a.qf=a})();


google-analytics_cx_api.js application/javascript
(function(){"use strict";const o=function(){};window.cxApi={chooseVariation:function(){return 0},getChosenVariation:o,setAllowHash:o,setChosenVariation:o,setCookiePath:o,setDomainName:o}})();


google-analytics_analytics.js application/javascript
(function(){"use strict";const n=function(){};const t=function(){};const e=t.prototype;e.get=n;e.set=n;e.send=n;const c=window;const o=c.GoogleAnalyticsObject||"ga";const i=c[o];const f=function(){const n=arguments.length;if(0===n)return;const t=Array.from(arguments);let e;let c=t[n-1];if(c instanceof Object&&c.hitCallback instanceof Function)e=c.hitCallback;else if(c instanceof Function)e=()=>{c(f.create())};else{const n=t.indexOf("hitCallback");if(-1!==n&&t[n+1]instanceof Function)e=t[n+1]}if(e instanceof Function===false)return;try{e()}catch(n){}};f.create=function(){return new t};f.getByName=function(){return new t};f.getAll=function(){return[]};f.remove=n;f.loaded=true;c[o]=f;const s=c.dataLayer;if(s instanceof Object){if(s.hide instanceof Object&&"function"===typeof s.hide.end)s.hide.end();if("function"===typeof s.push){const n=function(n){if(n instanceof Object===false)return;if("function"!==typeof n.eventCallback)return;setTimeout(n.eventCallback,1)};if(Array.isArray(s)){s.push=t=>n(t);const t=s.slice();for(const e of t)n(e)}}}if(i instanceof Function&&Array.isArray(i.q)){const n=i.q.slice();i.q.length=0;for(const t of n)f(...t)}})();


google-analytics.com/inpage_linkid.js application/javascript
(function(){"use strict";window._gaq=window._gaq||{push:function(){}}})();


google-analytics.com/ga.js application/javascript
(function(){"use strict";const t=function(){};const e=function(){};e.prototype.Na=t;e.prototype.O=t;e.prototype.Sa=t;e.prototype.Ta=t;e.prototype.Va=t;e.prototype._createAsyncTracker=t;e.prototype._getAsyncTracker=t;e.prototype._getPlugin=t;e.prototype.push=function(t){if("function"===typeof t){t();return}if(false===Array.isArray(t))return;if("string"===typeof t[0]&&/(^|\.)_link$/.test(t[0])&&"string"===typeof t[1])try{window.location.assign(t[1])}catch(t){}if("_set"===t[0]&&"hitCallback"===t[1]&&"function"===typeof t[2])t[2]()};const o=(function(){const e={};const o=["_addIgnoredOrganic _addIgnoredRef _addItem _addOrganic","_addTrans _clearIgnoredOrganic _clearIgnoredRef _clearOrganic","_cookiePathCopy _deleteCustomVar _getName _setAccount","_getAccount _getClientInfo _getDetectFlash _getDetectTitle","_getLinkerUrl _getLocalGifPath _getServiceMode _getVersion","_getVisitorCustomVar _initData _linkByPost","_setAllowAnchor _setAllowHash _setAllowLinker _setCampContentKey","_setCampMediumKey _setCampNameKey _setCampNOKey _setCampSourceKey","_setCampTermKey _setCampaignCookieTimeout _setCampaignTrack _setClientInfo","_setCookiePath _setCookiePersistence _setCookieTimeout _setCustomVar","_setDetectFlash _setDetectTitle _setDomainName _setLocalGifPath","_setLocalRemoteServerMode _setLocalServerMode _setReferrerOverride _setRemoteServerMode","_setSampleRate _setSessionTimeout _setSiteSpeedSampleRate _setSessionCookieTimeout","_setVar _setVisitorCookieTimeout _trackEvent _trackPageLoadTime","_trackPageview _trackSocial _trackTiming _trackTrans","_visitCode"].join(" ").split(/\s+/);for(const r of o)e[r]=t;e._getLinkerUrl=function(t){return t};e._link=function(t){if("string"!==typeof t)return;try{window.location.assign(t)}catch(t){}};return e})();const r=function(){};r.prototype._anonymizeIP=t;r.prototype._createTracker=t;r.prototype._forceSSL=t;r.prototype._getPlugin=t;r.prototype._getTracker=function(){return o};r.prototype._getTrackerByName=function(){return o};r.prototype._getTrackers=t;r.prototype.aa=t;r.prototype.ab=t;r.prototype.hb=t;r.prototype.la=t;r.prototype.oa=t;r.prototype.pa=t;r.prototype.u=t;const n=new r;window._gat=n;const a=new e;(function(){const t=window._gaq||[];if(Array.isArray(t))while(t[0])a.push(t.shift())})();window._gaq=a.qf=a})();


google-analytics.com/cx/api.js application/javascript
(function(){"use strict";const o=function(){};window.cxApi={chooseVariation:function(){return 0},getChosenVariation:o,setAllowHash:o,setChosenVariation:o,setCookiePath:o,setDomainName:o}})();


google-analytics.com/analytics.js application/javascript
(function(){"use strict";const n=function(){};const t=function(){};const e=t.prototype;e.get=n;e.set=n;e.send=n;const c=window;const o=c.GoogleAnalyticsObject||"ga";const i=c[o];const f=function(){const n=arguments.length;if(0===n)return;const t=Array.from(arguments);let e;let c=t[n-1];if(c instanceof Object&&c.hitCallback instanceof Function)e=c.hitCallback;else if(c instanceof Function)e=()=>{c(f.create())};else{const n=t.indexOf("hitCallback");if(-1!==n&&t[n+1]instanceof Function)e=t[n+1]}if(e instanceof Function===false)return;try{e()}catch(n){}};f.create=function(){return new t};f.getByName=function(){return new t};f.getAll=function(){return[]};f.remove=n;f.loaded=true;c[o]=f;const s=c.dataLayer;if(s instanceof Object){if(s.hide instanceof Object&&"function"===typeof s.hide.end)s.hide.end();if("function"===typeof s.push){const n=function(n){if(n instanceof Object===false)return;if("function"!==typeof n.eventCallback)return;setTimeout(n.eventCallback,1)};if(Array.isArray(s)){s.push=t=>n(t);const t=s.slice();for(const e of t)n(e)}}}if(i instanceof Function&&Array.isArray(i.q)){const n=i.q.slice();i.q.length=0;for(const t of n)f(...t)}})();


golem.de.js application/javascript
(function(){const n=window.addEventListener;window.addEventListener=function(t,i){n(...arguments);let e;try{e=i.toString()}catch(n){}if("string"===typeof e&&/^\s*function\s*\(\)\s*\{\s*window\.clearTimeout\(r\)\s*\}\s*$/.test(e))i()}.bind(window)})();


fuckadblock.js-3.2.0 application/javascript
(function(){"use strict";const o=function(){};const e=function(){};e.prototype.check=o;e.prototype.clearEvent=o;e.prototype.emitEvent=o;e.prototype.on=function(o,e){if(!o)e();return this};e.prototype.onDetected=function(){return this};e.prototype.onNotDetected=function(o){o();return this};e.prototype.setOption=o;const n=new e,t={get:function(){return e},set:function(){}},c={get:function(){return n},set:function(){}};if(window.hasOwnProperty("FuckAdBlock"))window.FuckAdBlock=e;else Object.defineProperty(window,"FuckAdBlock",t);if(window.hasOwnProperty("BlockAdBlock"))window.BlockAdBlock=e;else Object.defineProperty(window,"BlockAdBlock",t);if(window.hasOwnProperty("SniffAdBlock"))window.SniffAdBlock=e;else Object.defineProperty(window,"SniffAdBlock",t);if(window.hasOwnProperty("fuckAdBlock"))window.fuckAdBlock=n;else Object.defineProperty(window,"fuckAdBlock",c);if(window.hasOwnProperty("blockAdBlock"))window.blockAdBlock=n;else Object.defineProperty(window,"blockAdBlock",c);if(window.hasOwnProperty("sniffAdBlock"))window.sniffAdBlock=n;else Object.defineProperty(window,"sniffAdBlock",c)})();


doubleclick_instream_ad_status.js application/javascript
window.google_ad_status=1;


doubleclick.net/instream/ad_status.js application/javascript
window.google_ad_status=1;


disable-newtab-links.js application/javascript
(function(){document.addEventListener("click",(function(t){var e=t.target;while(null!==e){if("a"===e.localName&&e.hasAttribute("target")){t.stopPropagation();t.preventDefault();break}e=e.parentNode}}))})();


damoh-defuser.js application/javascript
(function(){const t=new WeakSet;let e;const n=function(){e=void 0;const n=document.querySelector("video");if(null===n)return;if(t.has(n))return;t.add(n);n.pause();n.controls=true;let r=n.querySelector('meta[itemprop="contentURL"][content]');if(null===r)return;n.src=r.getAttribute("content");r=n.querySelector('meta[itemprop="thumbnailUrl"][content]');if(null!==r)n.poster=r.getAttribute("content")};const r=function(){if(void 0!==e)return;e=window.requestAnimationFrame(n)};const o=new MutationObserver(r);o.observe(document,{childList:true,subtree:true})})();


d3pkae9owd2lcf.cloudfront.net/mb105.js application/javascript
(function(){"use strict";const o=function(){};window.pbjs={libLoaded:true};const t=window.MonkeyBroker||{addAttribute:o,addSlot:function(o){this.slots[o.slot]={}},defineSlot:o,fillSlot:o,go:o,inventoryConditionalPlacement:o,registerSizeCallback:o,registerSlotCallback:o,slots:{},version:""};t.regSlotsMap=t.slots;window.MonkeyBroker=t})();


cookie-remover.js application/javascript
(function(){const e="{{1}}";let o=/./;if(/^\/.+\/$/.test(e))o=new RegExp(e.slice(1,-1));else if(""!==e&&"{{1}}"!==e)o=new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));const t=function(){document.cookie.split(";").forEach((e=>{let t=e.indexOf("=");if(-1===t)return;let n=e.slice(0,t).trim();if(!o.test(n))return;let i=n+"=";let c="; domain="+document.location.hostname;let d="; domain=."+document.location.hostname;let m,a;let l=document.domain;if(l){if(l!==document.location.hostname)m="; domain=."+l;if(l.startsWith("www."))a="; domain="+l.replace("www","")}let u="; path=/";let s="; Max-Age=-1000; expires=Thu, 01 Jan 1970 00:00:00 GMT";document.cookie=i+s;document.cookie=i+c+s;document.cookie=i+d+s;document.cookie=i+u+s;document.cookie=i+c+u+s;document.cookie=i+d+u+s;if(void 0!==m)document.cookie=i+m+u+s;if(void 0!==a)document.cookie=i+a+u+s}))};t();window.addEventListener("beforeunload",t)})();


chartbeat.js application/javascript
(function(){"use strict";const t=function(){};window.pSUPERFLY={activity:t,virtualPage:t}})();


bab-defuser.js application/javascript
(function(){"use strict";const e=[["blockadblock"],["babasbm"],[/getItem\('babn'\)/],["getElementById","String.fromCharCode","ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789","charAt","DOMContentLoaded","AdBlock","addEventListener","doScroll","fromCharCode","<<2|r>>4","sessionStorage","clientWidth","localStorage","Math","random"]];const t=function(t){for(let n=0;n<e.length;n++){const o=e[n];let r=0;for(let e=0;e<o.length;e++){const n=o[e];const i=n instanceof RegExp?t.search(n):t.indexOf(n);if(-1!==i)r+=1}if(r/o.length>=.8)return true}return false};window.eval=new Proxy(window.eval,{apply:function(e,n,o){const r=o[0];if("string"!==typeof r||!t(r))return e.apply(n,o);if(document.body)document.body.style.removeProperty("visibility");let i=document.getElementById("babasbmsgx");if(i)i.parentNode.removeChild(i)}});window.setTimeout=new Proxy(window.setTimeout,{apply:function(e,t,n){const o=n[0];if("string"!==typeof o||false===/\.bab_elementid.$/.test(o))return e.apply(t,n)}})})();


aost.js application/javascript
(function(){let t="{{1}}";let e="{{2}}";let n="{{3}}";const i=/[.*+?^${}()|[\]\\]/g;if(""===e||"{{2}}"===e)e="^";else if(/^\/.+\/$/.test(e))e=e.slice(1,-1);else e=e.replace(i,"\\$&");const o=new RegExp(e);const r=String.fromCharCode(26*Math.random()+97)+Math.floor((.25+.75*Math.random())*Number.MAX_SAFE_INTEGER).toString(36).slice(-8);const c=console.log.bind(console);const s=self.Error;const f=function(t){let e=self.location.href;const i=e.indexOf("#");if(-1!==i)e=e.slice(0,i);const s=[];for(let n of t.stack.split(/[\n\r]+/)){if(n.includes(r))continue;n=n.trim();let t=/(.*?@)?(\S+)(:\d+):\d+\)?$/.exec(n);if(null===t)continue;let i=t[2];if(i.startsWith("("))i=i.slice(1);if(i===e)i="inlineScript";else if(i.startsWith("<anonymous>"))i="injectedScript";let o=void 0!==t[1]?t[1].slice(0,-1):n.slice(0,t.index).trim();if(o.startsWith("at"))o=o.slice(2).trim();let c=t[3];s.push(" "+`${o} ${i}${c}:1`.trim())}s[0]=`stackDepth:${s.length-1}`;const f=s.join("\t");const l=o.test(f);if("1"===n||"2"===n&&l||"3"===n&&!l)c(f.replace(/\t/g,"\n"));return l};const l=function(t,e){const n=e.indexOf(".");if(-1===n){let n=t[e];Object.defineProperty(t,e,{get:function(){if(f(new s(r)))throw new ReferenceError(r);return n},set:function(t){if(f(new s(r)))throw new ReferenceError(r);n=t}});return}const i=e.slice(0,n);let o=t[i];e=e.slice(n+1);if(o){l(o,e);return}const c=Object.getOwnPropertyDescriptor(t,i);if(c&&void 0!==c.set)return;Object.defineProperty(t,i,{get:function(){return o},set:function(t){o=t;if(t instanceof Object)l(t,e)}})};const u=window;l(u,t);const d=window.onerror;window.onerror=function(t,e,n,i,o){if("string"===typeof t&&-1!==t.indexOf(r))return true;if(d instanceof Function)return d(t,e,n,i,o)}.bind()})();


aopw.js application/javascript
(function(){const n=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);let e="{{1}}";let r=window;for(;;){const n=e.indexOf(".");if(-1===n)break;r=r[e.slice(0,n)];if(r instanceof Object===false)return;e=e.slice(n+1)}delete r[e];Object.defineProperty(r,e,{set:function(){throw new ReferenceError(n)}});const t=window.onerror;window.onerror=function(e,r,o,i,f){if("string"===typeof e&&-1!==e.indexOf(n))return true;if(t instanceof Function)return t(e,r,o,i,f)}.bind()})();


aopr.js application/javascript
(function(){const t=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);const n=function(){throw new ReferenceError(t)};const e=function(t,o){const r=o.indexOf(".");if(-1===r){const e=Object.getOwnPropertyDescriptor(t,o);if(!e||e.get!==n)Object.defineProperty(t,o,{get:n,set:function(){}});return}const i=o.slice(0,r);let c=t[i];o=o.slice(r+1);if(c){e(c,o);return}const f=Object.getOwnPropertyDescriptor(t,i);if(f&&void 0!==f.set)return;Object.defineProperty(t,i,{get:function(){return c},set:function(t){c=t;if(t instanceof Object)e(t,o)}})};const o=window;let r="{{1}}";e(o,r);const i=window.onerror;window.onerror=function(n,e,o,r,c){if("string"===typeof n&&-1!==n.indexOf(t))return true;if(i instanceof Function)return i(n,e,o,r,c)}.bind()})();


ampproject_v0.js application/javascript
(function(){"use strict";const t=document.head;if(!t)return;const n=document.createElement("style");n.textContent=["body {","  animation: none !important;","  overflow: unset !important;","}"].join("\n");t.appendChild(n)})();


ampproject.org/v0.js application/javascript
(function(){"use strict";const t=document.head;if(!t)return;const n=document.createElement("style");n.textContent=["body {","  animation: none !important;","  overflow: unset !important;","}"].join("\n");t.appendChild(n)})();


amazon_apstag.js application/javascript
(function(){"use strict";const t=window;const n=function(){}.bind();const i={fetchBids:function(t,n){if("function"===typeof n)n([])},init:n,setDisplayBids:n,targetingKeys:n};t.apstag=i})();


amazon_ads.js application/javascript
(function(){"use strict";if(t)return;var e=window;var a=function(){}.bind();var t={appendScriptTag:a,appendTargetingToAdServerUrl:a,appendTargetingToQueryString:a,clearTargetingFromGPTAsync:a,doAllTasks:a,doGetAdsAsync:a,doTask:a,detectIframeAndGetURL:a,getAds:a,getAdsAsync:a,getAdForSlot:a,getAdsCallback:a,getDisplayAds:a,getDisplayAdsAsync:a,getDisplayAdsCallback:a,getKeys:a,getReferrerURL:a,getScriptSource:a,getTargeting:a,getTokens:a,getValidMilliseconds:a,getVideoAds:a,getVideoAdsAsync:a,getVideoAdsCallback:a,handleCallBack:a,hasAds:a,renderAd:a,saveAds:a,setTargeting:a,setTargetingForGPTAsync:a,setTargetingForGPTSync:a,tryGetAdsAsync:a,updateAds:a};e.amznads=t;e.amzn_ads=e.amzn_ads||a;e.aax_write=e.aax_write||a;e.aax_render_ad=e.aax_render_ad||a})();


amazon-adsystem.com/aax2/amzn_ads.js application/javascript
(function(){"use strict";if(t)return;var e=window;var a=function(){}.bind();var t={appendScriptTag:a,appendTargetingToAdServerUrl:a,appendTargetingToQueryString:a,clearTargetingFromGPTAsync:a,doAllTasks:a,doGetAdsAsync:a,doTask:a,detectIframeAndGetURL:a,getAds:a,getAdsAsync:a,getAdForSlot:a,getAdsCallback:a,getDisplayAds:a,getDisplayAdsAsync:a,getDisplayAdsCallback:a,getKeys:a,getReferrerURL:a,getScriptSource:a,getTargeting:a,getTokens:a,getValidMilliseconds:a,getVideoAds:a,getVideoAdsAsync:a,getVideoAdsCallback:a,handleCallBack:a,hasAds:a,renderAd:a,saveAds:a,setTargeting:a,setTargetingForGPTAsync:a,setTargetingForGPTSync:a,tryGetAdsAsync:a,updateAds:a};e.amznads=t;e.amzn_ads=e.amzn_ads||a;e.aax_write=e.aax_write||a;e.aax_render_ad=e.aax_render_ad||a})();


alert-buster.js application/javascript
(function(){window.alert=function(n){console.info(n)}})();


aell.js application/javascript
(function(){const t=console.log.bind(console);self.EventTarget.prototype.addEventListener=new Proxy(self.EventTarget.prototype.addEventListener,{apply:function(e,n,o){let r,s;try{r=String(o[0]);s=String(o[1])}catch(t){}t('uBO: addEventListener("%s", %s)',r,s);return e.apply(n,o)}})})();


aeld.js application/javascript
(function(){let e="{{1}}";if(""===e||"{{1}}"===e)e=".?";else if(/^\/.+\/$/.test(e))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");e=new RegExp(e);let t="{{2}}";if(""===t||"{{2}}"===t)t=".?";else if(/^\/.+\/$/.test(t))t=t.slice(1,-1);else t=t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");t=new RegExp(t);self.EventTarget.prototype.addEventListener=new Proxy(self.EventTarget.prototype.addEventListener,{apply:function(l,n,s){let r,i;try{r=String(s[0]);i=String(s[1])}catch(e){}if(false===e.test(r)||false===t.test(i))return l.apply(n,s)}})})();


adfly-defuser.js application/javascript
(function(){var t=/^\d$/;var r=function(r){var e="",n="",o;for(o=0;o<r.length;o++)if(o%2===0)e+=r.charAt(o);else n=r.charAt(o)+n;var i=(e+n).split("");for(o=0;o<i.length;o++)if(t.test(i[o]))for(var a=o+1;a<i.length;a++)if(t.test(i[a])){var f=parseInt(i[o],10)^parseInt(i[a],10);if(f<10)i[o]=f.toString();o=a;break}i=i.join("");var s=window.atob(i).slice(16,-16);window.stop();window.onbeforeunload=null;window.location.href=s};try{var e;var n=true;window.Object.defineProperty(window,"ysmm",{configurable:false,set:function(t){if(n){n=false;try{if("string"===typeof t)r(t)}catch(t){}}e=t},get:function(){return e}})}catch(t){window.console.error("Failed to set up Adfly bypasser!")}})();


addthis_widget.js application/javascript
(function(){"use strict";const t=function(){};window.addthis={addEventListener:t,button:t,init:t,layers:t,ready:t,sharecounters:{getShareCounts:t},toolbox:t,update:t}})();


addthis.com/addthis_widget.js application/javascript
(function(){"use strict";const t=function(){};window.addthis={addEventListener:t,button:t,init:t,layers:t,ready:t,sharecounters:{getShareCounts:t},toolbox:t,update:t}})();


addEventListener-logger.js application/javascript
(function(){const t=console.log.bind(console);self.EventTarget.prototype.addEventListener=new Proxy(self.EventTarget.prototype.addEventListener,{apply:function(e,n,o){let r,s;try{r=String(o[0]);s=String(o[1])}catch(t){}t('uBO: addEventListener("%s", %s)',r,s);return e.apply(n,o)}})})();


addEventListener-defuser.js application/javascript
(function(){let e="{{1}}";if(""===e||"{{1}}"===e)e=".?";else if(/^\/.+\/$/.test(e))e=e.slice(1,-1);else e=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");e=new RegExp(e);let t="{{2}}";if(""===t||"{{2}}"===t)t=".?";else if(/^\/.+\/$/.test(t))t=t.slice(1,-1);else t=t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");t=new RegExp(t);self.EventTarget.prototype.addEventListener=new Proxy(self.EventTarget.prototype.addEventListener,{apply:function(l,n,s){let r,i;try{r=String(s[0]);i=String(s[1])}catch(e){}if(false===e.test(r)||false===t.test(i))return l.apply(n,s)}})})();


acs.js application/javascript
(function(){const e="{{1}}";if(""===e||"{{1}}"===e)return;const t=/[.*+?^${}()|[\]\\]/g;const n="{{2}}";const r=(()=>{if(""===n||"{{2}}"===n)return/^/;if(/^\/.+\/$/.test(n))return new RegExp(n.slice(1,-1));return new RegExp(n.replace(t,"\\$&"))})();const c="{{3}}";const o=(()=>{if(""===c||"{{3}}"===c)return/^$/;if(/^\/.+\/$/.test(c))return new RegExp(c.slice(1,-1));return new RegExp(c.replace(t,"\\$&"))})();const i=document.currentScript;const s=e.split(".");let f=window;let a;for(;;){a=s.shift();if(0===s.length)break;f=f[a];if(f instanceof Object===false)return}let u;let l=Object.getOwnPropertyDescriptor(f,a);if(l instanceof Object===false||l.get instanceof Function===false){u=f[a];l=void 0}const p=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);const d=new WeakMap;const w=e=>{let t=e.textContent;if(""!==t.trim())return t;if(d.has(e))return d.get(e);const[,n,r]=/^data:([^,]*),(.+)$/.exec(e.src.trim())||["","",""];try{switch(true){case n.endsWith(";base64"):t=self.atob(r);break;default:t=self.decodeURIComponent(r);break}}catch(e){}d.set(e,t);return t};const g=()=>{const e=document.currentScript;if(e instanceof HTMLScriptElement===false)return;if(false===o.test(e.src))return;if(e===i)return;if(false===r.test(w(e)))return;throw new ReferenceError(p)};Object.defineProperty(f,a,{get:function(){g();return l instanceof Object?l.get.call(f):u},set:function(e){g();if(l instanceof Object)l.set.call(f,e);else u=e}});const b=window.onerror;window.onerror=function(e){if("string"===typeof e&&e.includes(p))return true;if(b instanceof Function)return b.apply(this,arguments)}.bind()})();


acis.js application/javascript
(function(){const e="{{1}}";if(""===e||"{{1}}"===e)return;const t=/[.*+?^${}()|[\]\\]/g;const n="{{2}}";const r=(()=>{if(""===n||"{{2}}"===n)return/^/;if(/^\/.+\/$/.test(n))return new RegExp(n.slice(1,-1));return new RegExp(n.replace(t,"\\$&"))})();const c="{{3}}";const o=(()=>{if(""===c||"{{3}}"===c)return/^$/;if(/^\/.+\/$/.test(c))return new RegExp(c.slice(1,-1));return new RegExp(c.replace(t,"\\$&"))})();const i=document.currentScript;const s=e.split(".");let f=window;let a;for(;;){a=s.shift();if(0===s.length)break;f=f[a];if(f instanceof Object===false)return}let u;let l=Object.getOwnPropertyDescriptor(f,a);if(l instanceof Object===false||l.get instanceof Function===false){u=f[a];l=void 0}const p=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);const d=new WeakMap;const w=e=>{let t=e.textContent;if(""!==t.trim())return t;if(d.has(e))return d.get(e);const[,n,r]=/^data:([^,]*),(.+)$/.exec(e.src.trim())||["","",""];try{switch(true){case n.endsWith(";base64"):t=self.atob(r);break;default:t=self.decodeURIComponent(r);break}}catch(e){}d.set(e,t);return t};const g=()=>{const e=document.currentScript;if(e instanceof HTMLScriptElement===false)return;if(false===o.test(e.src))return;if(e===i)return;if(false===r.test(w(e)))return;throw new ReferenceError(p)};Object.defineProperty(f,a,{get:function(){g();return l instanceof Object?l.get.call(f):u},set:function(e){g();if(l instanceof Object)l.set.call(f,e);else u=e}});const b=window.onerror;window.onerror=function(e){if("string"===typeof e&&e.includes(p))return true;if(b instanceof Function)return b.apply(this,arguments)}.bind()})();


abort-on-stack-trace.js application/javascript
(function(){let t="{{1}}";let e="{{2}}";let n="{{3}}";const i=/[.*+?^${}()|[\]\\]/g;if(""===e||"{{2}}"===e)e="^";else if(/^\/.+\/$/.test(e))e=e.slice(1,-1);else e=e.replace(i,"\\$&");const o=new RegExp(e);const r=String.fromCharCode(26*Math.random()+97)+Math.floor((.25+.75*Math.random())*Number.MAX_SAFE_INTEGER).toString(36).slice(-8);const c=console.log.bind(console);const s=self.Error;const f=function(t){let e=self.location.href;const i=e.indexOf("#");if(-1!==i)e=e.slice(0,i);const s=[];for(let n of t.stack.split(/[\n\r]+/)){if(n.includes(r))continue;n=n.trim();let t=/(.*?@)?(\S+)(:\d+):\d+\)?$/.exec(n);if(null===t)continue;let i=t[2];if(i.startsWith("("))i=i.slice(1);if(i===e)i="inlineScript";else if(i.startsWith("<anonymous>"))i="injectedScript";let o=void 0!==t[1]?t[1].slice(0,-1):n.slice(0,t.index).trim();if(o.startsWith("at"))o=o.slice(2).trim();let c=t[3];s.push(" "+`${o} ${i}${c}:1`.trim())}s[0]=`stackDepth:${s.length-1}`;const f=s.join("\t");const l=o.test(f);if("1"===n||"2"===n&&l||"3"===n&&!l)c(f.replace(/\t/g,"\n"));return l};const l=function(t,e){const n=e.indexOf(".");if(-1===n){let n=t[e];Object.defineProperty(t,e,{get:function(){if(f(new s(r)))throw new ReferenceError(r);return n},set:function(t){if(f(new s(r)))throw new ReferenceError(r);n=t}});return}const i=e.slice(0,n);let o=t[i];e=e.slice(n+1);if(o){l(o,e);return}const c=Object.getOwnPropertyDescriptor(t,i);if(c&&void 0!==c.set)return;Object.defineProperty(t,i,{get:function(){return o},set:function(t){o=t;if(t instanceof Object)l(t,e)}})};const u=window;l(u,t);const d=window.onerror;window.onerror=function(t,e,n,i,o){if("string"===typeof t&&-1!==t.indexOf(r))return true;if(d instanceof Function)return d(t,e,n,i,o)}.bind()})();


abort-on-property-write.js application/javascript
(function(){const n=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);let e="{{1}}";let r=window;for(;;){const n=e.indexOf(".");if(-1===n)break;r=r[e.slice(0,n)];if(r instanceof Object===false)return;e=e.slice(n+1)}delete r[e];Object.defineProperty(r,e,{set:function(){throw new ReferenceError(n)}});const t=window.onerror;window.onerror=function(e,r,o,i,f){if("string"===typeof e&&-1!==e.indexOf(n))return true;if(t instanceof Function)return t(e,r,o,i,f)}.bind()})();


abort-on-property-read.js application/javascript
(function(){const t=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);const n=function(){throw new ReferenceError(t)};const e=function(t,o){const r=o.indexOf(".");if(-1===r){const e=Object.getOwnPropertyDescriptor(t,o);if(!e||e.get!==n)Object.defineProperty(t,o,{get:n,set:function(){}});return}const i=o.slice(0,r);let c=t[i];o=o.slice(r+1);if(c){e(c,o);return}const f=Object.getOwnPropertyDescriptor(t,i);if(f&&void 0!==f.set)return;Object.defineProperty(t,i,{get:function(){return c},set:function(t){c=t;if(t instanceof Object)e(t,o)}})};const o=window;let r="{{1}}";e(o,r);const i=window.onerror;window.onerror=function(n,e,o,r,c){if("string"===typeof n&&-1!==n.indexOf(t))return true;if(i instanceof Function)return i(n,e,o,r,c)}.bind()})();


abort-current-script.js application/javascript
(function(){const e="{{1}}";if(""===e||"{{1}}"===e)return;const t=/[.*+?^${}()|[\]\\]/g;const n="{{2}}";const r=(()=>{if(""===n||"{{2}}"===n)return/^/;if(/^\/.+\/$/.test(n))return new RegExp(n.slice(1,-1));return new RegExp(n.replace(t,"\\$&"))})();const c="{{3}}";const o=(()=>{if(""===c||"{{3}}"===c)return/^$/;if(/^\/.+\/$/.test(c))return new RegExp(c.slice(1,-1));return new RegExp(c.replace(t,"\\$&"))})();const i=document.currentScript;const s=e.split(".");let f=window;let a;for(;;){a=s.shift();if(0===s.length)break;f=f[a];if(f instanceof Object===false)return}let u;let l=Object.getOwnPropertyDescriptor(f,a);if(l instanceof Object===false||l.get instanceof Function===false){u=f[a];l=void 0}const p=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);const d=new WeakMap;const w=e=>{let t=e.textContent;if(""!==t.trim())return t;if(d.has(e))return d.get(e);const[,n,r]=/^data:([^,]*),(.+)$/.exec(e.src.trim())||["","",""];try{switch(true){case n.endsWith(";base64"):t=self.atob(r);break;default:t=self.decodeURIComponent(r);break}}catch(e){}d.set(e,t);return t};const g=()=>{const e=document.currentScript;if(e instanceof HTMLScriptElement===false)return;if(false===o.test(e.src))return;if(e===i)return;if(false===r.test(w(e)))return;throw new ReferenceError(p)};Object.defineProperty(f,a,{get:function(){g();return l instanceof Object?l.get.call(f):u},set:function(e){g();if(l instanceof Object)l.set.call(f,e);else u=e}});const b=window.onerror;window.onerror=function(e){if("string"===typeof e&&e.includes(p))return true;if(b instanceof Function)return b.apply(this,arguments)}.bind()})();


abort-current-inline-script.js application/javascript
(function(){const e="{{1}}";if(""===e||"{{1}}"===e)return;const t=/[.*+?^${}()|[\]\\]/g;const n="{{2}}";const r=(()=>{if(""===n||"{{2}}"===n)return/^/;if(/^\/.+\/$/.test(n))return new RegExp(n.slice(1,-1));return new RegExp(n.replace(t,"\\$&"))})();const c="{{3}}";const o=(()=>{if(""===c||"{{3}}"===c)return/^$/;if(/^\/.+\/$/.test(c))return new RegExp(c.slice(1,-1));return new RegExp(c.replace(t,"\\$&"))})();const i=document.currentScript;const s=e.split(".");let f=window;let a;for(;;){a=s.shift();if(0===s.length)break;f=f[a];if(f instanceof Object===false)return}let u;let l=Object.getOwnPropertyDescriptor(f,a);if(l instanceof Object===false||l.get instanceof Function===false){u=f[a];l=void 0}const p=String.fromCharCode(Date.now()%26+97)+Math.floor(982451653*Math.random()+982451653).toString(36);const d=new WeakMap;const w=e=>{let t=e.textContent;if(""!==t.trim())return t;if(d.has(e))return d.get(e);const[,n,r]=/^data:([^,]*),(.+)$/.exec(e.src.trim())||["","",""];try{switch(true){case n.endsWith(";base64"):t=self.atob(r);break;default:t=self.decodeURIComponent(r);break}}catch(e){}d.set(e,t);return t};const g=()=>{const e=document.currentScript;if(e instanceof HTMLScriptElement===false)return;if(false===o.test(e.src))return;if(e===i)return;if(false===r.test(w(e)))return;throw new ReferenceError(p)};Object.defineProperty(f,a,{get:function(){g();return l instanceof Object?l.get.call(f):u},set:function(e){g();if(l instanceof Object)l.set.call(f,e);else u=e}});const b=window.onerror;window.onerror=function(e){if("string"===typeof e&&e.includes(p))return true;if(b instanceof Function)return b.apply(this,arguments)}.bind()})();


3x2.png image/png;base64
iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAC0lEQVQI12NgwAUAABoAASRETuUAAAAASUVORK5CYII=


3x2-transparent.png image/png;base64
iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAC0lEQVQI12NgwAUAABoAASRETuUAAAAASUVORK5CYII=


32x32.png image/png;base64
iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGklEQVRYw+3BAQEAAACCIP+vbkhAAQAAAO8GECAAAZf3V9cAAAAASUVORK5CYII=


32x32-transparent.png image/png;base64
iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGklEQVRYw+3BAQEAAACCIP+vbkhAAQAAAO8GECAAAZf3V9cAAAAASUVORK5CYII=


2x2.png image/png;base64
iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAC0lEQVQI12NgQAcAABIAAe+JVKQAAAAASUVORK5CYII=


2x2-transparent.png image/png;base64
iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAC0lEQVQI12NgQAcAABIAAe+JVKQAAAAASUVORK5CYII=


1x1.gif image/gif;base64
R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==


1x1-transparent.gif image/gif;base64
R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==