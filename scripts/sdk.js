function writeSDK(apikey, noticeid, userCountry, userRegion, global, staging) {
  var _staging = staging ? "staging." : "";
  window.gdprAppliesGlobally = global;
  (function () {
    function n(e) {
      if (!window.frames[e]) {
        if (document.body && document.body.firstChild) {
          var t = document.body;
          var r = document.createElement("iframe");
          r.style.display = "none";
          r.name = e;
          r.title = e;
          t.insertBefore(r, t.firstChild);
        } else {
          setTimeout(function () {
            n(e);
          }, 5);
        }
      }
    }
    function e(r, a, o, c, s) {
      function e(e, t, r, n) {
        if (typeof r !== "function") {
          return;
        }
        if (!window[a]) {
          window[a] = [];
        }
        var i = false;
        if (s) {
          i = s(e, n, r);
        }
        if (!i) {
          window[a].push({ command: e, version: t, callback: r, parameter: n });
        }
      }
      e.stub = true;
      e.stubVersion = 2;
      function t(n) {
        if (!window[r] || window[r].stub !== true) {
          return;
        }
        if (!n.data) {
          return;
        }
        var i = typeof n.data === "string";
        var e;
        try {
          e = i ? JSON.parse(n.data) : n.data;
        } catch (t) {
          return;
        }
        if (e[o]) {
          var a = e[o];
          window[r](
            a.command,
            a.version,
            function (e, t) {
              var r = {};
              r[c] = { returnValue: e, success: t, callId: a.callId };
              n.source.postMessage(i ? JSON.stringify(r) : r, "*");
            },
            a.parameter,
          );
        }
      }
      if (typeof window[r] !== "function") {
        window[r] = e;
        if (window.addEventListener) {
          window.addEventListener("message", t, false);
        } else {
          window.attachEvent("onmessage", t);
        }
      }
    }
    e("__tcfapi", "__tcfapiBuffer", "__tcfapiCall", "__tcfapiReturn");
    n("__tcfapiLocator");
    (function (e, t) {
      var r = document.createElement("link");
      r.rel = "preconnect";
      r.as = "script";
      var n = document.createElement("link");
      n.rel = "dns-prefetch";
      n.as = "script";
      var i = document.createElement("link");
      i.rel = "preload";
      i.as = "script";
      var a = document.createElement("script");
      a.id = "spcloader";
      a.type = "text/javascript";
      a["async"] = true;
      a.charset = "utf-8";
      var o = "https://sdk." + _staging + "privacy-center.org/" + e + "/loader.js?target_type=notice&target=" + t;
      if (window.didomiConfig && window.didomiConfig.user) {
        var c = window.didomiConfig.user;
        var s = c.country;
        var d = c.region;
        if (s) {
          o = o + "&country=" + s;
          if (d) {
            o = o + "&region=" + d;
          }
        }
      } else if (userCountry) {
        var s = userCountry;
        var d = userRegion;
        if (s) {
          o = o + "&country=" + s;
          if (d) {
            o = o + "&region=" + d;
          }
        }
      }
      r.href = "https://sdk." + _staging + "privacy-center.org/";
      n.href = "https://sdk." + _staging + "privacy-center.org/";
      i.href = o;
      a.src = o;
      var f = document.getElementsByTagName("script")[0];
      f.parentNode.insertBefore(r, f);
      f.parentNode.insertBefore(n, f);
      f.parentNode.insertBefore(i, f);
      f.parentNode.insertBefore(a, f);
    })(apikey, noticeid);
  })();
}
