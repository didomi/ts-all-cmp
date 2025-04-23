var textArea = document.getElementsByTagName("textarea")[0];
var apikey = new URL(document.location.href).searchParams.get("apiKey");
var noticeid = new URL(document.location.href).searchParams.get("notice_id");
var userCountry = new URL(document.location.href).searchParams.get("country");
var userRegion = new URL(document.location.href).searchParams.get("region");
var commitHash = new URL(document.location.href).searchParams.get(
  "commit_hash",
);
var staging = parseInt(
  new URL(document.location.href).searchParams.get("staging"),
)
  ? true
  : false;
var preprod = parseInt(
  new URL(document.location.href).searchParams.get("preprod"),
)
  ? true
  : false;
var staticLoader = parseInt(
  new URL(document.location.href).searchParams.get("static"),
)
  ? true
  : false;
var gppStub = parseInt(
  new URL(document.location.href).searchParams.get("gpp_stub"),
)
  ? true
  : false;
var ctvPlatform = parseInt(
  new URL(document.location.href).searchParams.get("ctv_platform"),
)
  ? true
  : false;

function setCheckedStatus(el) {
  const toggleContainer = el.closest(".toggle_container");
  if (toggleContainer) {
    if (el.checked) {
      toggleContainer.setAttribute("data-checked", "true");
    } else {
      toggleContainer.setAttribute("data-checked", "false");
    }
  }
}

Array.from(document.querySelectorAll("input")).forEach((input) => {
  input.addEventListener("keyup", () => {
    updateUrl();
  });
  input.addEventListener("change", (e) => {
    setCheckedStatus(e.target);
    updateUrl();
  });
});

textArea.addEventListener("keyup", () => {
  updateUrl();
});

function updateUrl() {
  var params = Array.from(document.querySelectorAll('[type="text"][data-qp]'))
    .map((el) => {
      return el.getAttribute("data-qp") + "=" + el.value;
    })
    .join("&");

  params +=
    "&" +
    Array.from(document.querySelectorAll('[type="checkbox"][data-qp]'))
      .map((el) => {
        return el.getAttribute("data-qp") + "=" + (el.checked ? "1" : "0");
      })
      .join("&");

  if (isJSONvalid(textArea.value)) {
    var jsonStr = textArea.value;
    jsonStr = jsonStr.replace(/\s\s+/g, " ");
    params += "&config=" + btoa(jsonStr);
  }

  var newurl =
    window.location.protocol +
    "//" +
    window.location.host +
    window.location.pathname +
    "?" +
    params;
  window.history.pushState({ path: newurl }, "", newurl);
}

function updateInputs() {
  Array.from(document.querySelectorAll('[type="text"][data-qp]')).forEach(
    (input) => {
      input.value = new URL(document.location.href).searchParams.get(
        input.getAttribute("data-qp"),
      );
    },
  );

  Array.from(document.querySelectorAll('[type="checkbox"][data-qp]')).forEach(
    (input) => {
      input.checked = parseInt(
        new URL(document.location.href).searchParams.get(
          input.getAttribute("data-qp"),
        ),
      )
        ? true
        : false;
    },
  );

  if (new URL(document.location.href).searchParams.get("config")) {
    textArea.value = atob(
      new URL(document.location.href).searchParams.get("config"),
    );
    prettyPrint();
  }
}

/* Custom JSON */
function prettyPrint() {
  var ugly = textArea.value;
  var obj = JSON.parse(ugly);
  var pretty = JSON.stringify(obj, undefined, 2);
  textArea.value = pretty;
}

function isJSONvalid(text) {
  try {
    JSON.parse(text);
  } catch (e) {
    return false;
  }
  return true;
}

function disableCTV() {
  var url = new URL(window.location.href);
  url.searchParams.set("ctv_platform", "0");
  window.location.href = url.toString();
}

textArea.addEventListener("keyup", function () {
  if (isJSONvalid(this.value)) {
    this.classList.remove("invalid");
  } else {
    this.classList.add("invalid");
  }
});

window.onload = function () {
  if (
    new URL(document.location.href).searchParams.get("config") &&
    parseInt(new URL(document.location.href).searchParams.get("apply_conf"))
  ) {
    window.didomiConfig = JSON.parse(
      atob(new URL(document.location.href).searchParams.get("config")),
    );

    // If both user country and region are specified, and not already set in `didomiConfig`, they will be added accordingly
    if (userCountry && !window.didomiConfig?.user?.country) {
      window.didomiConfig.user = window.didomiConfig.user || {};
      window.didomiConfig.user.country = userCountry;

      if (userRegion && !window.didomiConfig.user.region) {
        window.didomiConfig.user.region = userRegion;
      }
    }
  }

  if (apikey && noticeid && ctvPlatform) {
    // Force enabling Didomi notice
    window.didomiConfig = window.didomiConfig || {};
    window.didomiConfig.notice = window.didomiConfig.notice || {};
    window.didomiConfig.notice.enable = true;
  }

  if (apikey && noticeid) {
    updateInputs();
    writeSDK(
      apikey,
      noticeid,
      userCountry,
      userRegion,
      staging,
      commitHash,
      staticLoader,
      gppStub,
      ctvPlatform,
      preprod,
    );
  }

  Array.from(document.querySelectorAll('[type="checkbox"][data-qp]')).forEach(
    function (el) {
      setCheckedStatus(el);
    },
  );

  window.didomiOnReady = window.didomiOnReady || [];
  window.didomiOnReady.push(function () {
    if (
      window.Didomi &&
      window.Didomi.getConfig() &&
      window.Didomi.getConfig().regulation &&
      window.Didomi.getConfig().regulation.name === "none"
    ) {
      var banner = document.createElement("div");
      banner.setAttribute("id", "no-regulation-banner");
      banner.textContent = "No applicable regulation found (none)";
      document.body.insertBefore(banner, document.body.firstChild);
      banner.classList.add("visible");
      var bannerHeight = banner.offsetHeight;
      document.body.style.paddingTop = bannerHeight + "px";
    }

    if (apikey && noticeid && ctvPlatform) {
      // Display the toast notification
      var toast = document.createElement("div");
      toast.className = "toast";
      toast.innerHTML = `CTV is enabled${window.Didomi && window.Didomi.notice && !window.Didomi.notice.isVisible() ? " and not visible" : ""}.<button onclick="disableCTV()">Click here to disable</button>`;
      document.body.appendChild(toast);

      var toastStyle = document.createElement("link");
      toastStyle.rel = "stylesheet";
      toastStyle.href = "style/toast.css";
      document.head.appendChild(toastStyle);
    }
  });
};
