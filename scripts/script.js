const params = new URL(document.location.href).searchParams;
const textArea = document.getElementsByTagName("textarea")[0];

const apikey = params.get("apiKey");
const noticeid = params.get("notice_id");
const userCountry = params.get("country");
const userRegion = params.get("region");
const commitHash = params.get("commit_hash");
const config = params.get("config");

const staging = Boolean(parseInt(params.get("staging")));
const preprod = Boolean(parseInt(params.get("preprod")));
const gppStub = Boolean(parseInt(params.get("gpp_stub")));
const ctvPlatform = Boolean(parseInt(params.get("ctv_platform")));

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
  let params = Array.from(document.querySelectorAll('[type="text"][data-qp]'))
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
    let jsonStr = textArea.value;
    jsonStr = jsonStr.replace(/\s\s+/g, " ");
    params += "&config=" + btoa(jsonStr);
  }

  const newurl =
    window.location.protocol +
    "//" +
    window.location.host +
    window.location.pathname +
    "?" +
    params;
  window.history.pushState({ path: newurl }, "", newurl);
}

function isValidBase64(str) {
  if (typeof str !== "string") return false;

  if (str.length % 4 !== 0) return false;

  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  return base64Regex.test(str);
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

  if (config && isValidBase64(config)) {
    textArea.value = atob(config);
    prettyPrint();
  }
}

/* Custom JSON */
function prettyPrint() {
  const ugly = textArea.value;
  const obj = JSON.parse(ugly);
  const pretty = JSON.stringify(obj, undefined, 2);
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
  const url = new URL(window.location.href);
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
  if (config && parseInt(params.get("apply_conf")) && isValidBase64(config)) {
    window.didomiConfig = JSON.parse(atob(config));

    // If both user country and region are specified, and not already set in `didomiConfig`, they will be added accordingly
    if (userCountry && !window.didomiConfig?.user?.country) {
      window.didomiConfig.user = window.didomiConfig.user || {};
      window.didomiConfig.user.country = userCountry;

      if (userRegion && !window.didomiConfig.user.region) {
        window.didomiConfig.user.region = userRegion;
      }
    }
  }

  if (commitHash && apikey && noticeid) {
    window.didomiConfig = window.didomiConfig || {};
    window.didomiConfig.app = {
      sdkVersion: commitHash,
    };
  }

  // Force enabling Didomi notice
  if (apikey && noticeid && ctvPlatform) {
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

  setupTopBanner(apikey, noticeid, ctvPlatform);
};
