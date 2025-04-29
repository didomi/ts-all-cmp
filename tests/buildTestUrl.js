require("dotenv").config();

function buildTestUrl(params = {}) {
  return `${process.env.BASE_URL}/?${new URLSearchParams({ ...params }).toString()}`;
}

module.exports = { buildTestUrl };
