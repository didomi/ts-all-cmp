
function writeSDK(apikey, noticeid, global, staging) {
  var _staging = staging ? 'staging.' : '';
  window.gdprAppliesGlobally = global;
  (function() {
    function r() {
      if (!window.frames.__cmpLocator) {
        if (document.body && document.body.firstChild) {
          var e = document.body;
          var t = document.createElement("iframe");
          t.style.display = "none";
          t.name = "__cmpLocator";
          t.title = "cmpLocator";
          e.insertBefore(t, e.firstChild)
        } else {
          setTimeout(r, 5)
        }
      }
    }

    function e(e, t, r) {
      if (typeof r !== "function") {
        return
      }
      if (!window.__cmpBuffer) {
        window.__cmpBuffer = []
      }
      if (e === "ping") {
        r({
          gdprAppliesGlobally: window.gdprAppliesGlobally,
          cmpLoaded: false
        }, true)
      } else {
        window.__cmpBuffer.push({
          command: e,
          parameter: t,
          callback: r
        })
      }
    }
    e.stub = true;

    function t(a) {
      if (!window.__cmp || window.__cmp.stub !== true) {
        return
      }
      if (!a.data) {
        return
      }
      var n = typeof a.data === "string";
      var e;
      try {
        e = n ? JSON.parse(a.data) : a.data
      } catch (t) {
        return
      }
      if (e.__cmpCall) {
        var o = e.__cmpCall;
        window.__cmp(o.command, o.parameter, function(e, t) {
          var r = {
            __cmpReturn: {
              returnValue: e,
              success: t,
              callId: o.callId
            }
          };
          a.source.postMessage(n ? JSON.stringify(r) : r, "*")
        })
      }
    }
    if (typeof window.__cmp !== "function") {
      window.__cmp = e;
      if (window.addEventListener) {
        window.addEventListener("message", t, false)
      } else {
        window.attachEvent("onmessage", t)
      }
    }
    r()
  })();
  (function(e, t) {
    var r = document.createElement("script");
    r.id = "spcloader";
    r.type = "text/javascript";
    r.async = true;
    r.src = "https://sdk." + _staging + "privacy-center.org/" + e + "/loader.js?target_type=notice&target=" + t;
    r.charset = "utf-8";
    var a = document.getElementsByTagName("script")[0];
    a.parentNode.insertBefore(r, a)
  })(apikey, noticeid);
}
