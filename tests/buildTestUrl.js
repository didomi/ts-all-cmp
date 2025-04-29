const BASE_URL = "http://localhost:3000";

function buildTestUrl(params = {}) {
  return `${BASE_URL}/?${new URLSearchParams({ ...params }).toString()}`;
}

module.exports = { buildTestUrl };
