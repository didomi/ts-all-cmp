function setupTopBanner(apiKey, noticeId, ctvPlatform) {
  if (apiKey && noticeId) {
    window.didomiOnReady = window.didomiOnReady || [];
    window.didomiOnReady.push(function () {
      let bannerContent = "";
      let isCtvEnabled = false;

      const regulationName = window.Didomi?.getConfig?.()?.regulation?.name;
      if (regulationName === "none") {
        bannerContent += "No applicable regulation found (none).";
      }

      if (ctvPlatform) {
        isCtvEnabled = true;
        bannerContent += `${bannerContent ? " - " : ""}CTV mode is active${!window.Didomi?.notice?.isVisible?.() ? " but the notice is either not a CTV notice or it is hidden" : ""}. 
          <button class="banner-ctv-button" onclick="disableCTV()">Disable CTV</button>`;
      }

      renderBanner(bannerContent, isCtvEnabled);
    });
  } else {
    let errorMessage = "Error: ";

    if (!apiKey && !noticeId) {
      errorMessage += "API key and Notice ID are missing.";
    } else if (!apiKey) {
      errorMessage += "API key is missing.";
    } else if (!noticeId) {
      errorMessage += "Notice ID is missing.";
    }

    renderBanner(errorMessage);
  }
}

function renderBanner(content, isCtvEnabled = false) {
  if (!content) return;

  const banner = document.createElement("div");
  banner.id = "top-banner";
  banner.classList.add("visible");
  if (isCtvEnabled) {
    banner.classList.add("ctv-enabled");
  }

  banner.innerHTML = content;
  document.body.insertBefore(banner, document.body.firstChild);

  // Adjust page padding to account for the banner
  const bannerHeight = banner.offsetHeight;
  document.body.style.paddingTop = `${bannerHeight}px`;
}

function disableCTV() {
  const url = new URL(window.location.href);
  url.searchParams.set("ctv_platform", "0");
  window.location.href = url.toString();
}
