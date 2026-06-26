const assert = require("node:assert/strict");
const { analyzeContentQuality } = require("../lib/contentQuality");

assert.equal(
  analyzeContentQuality("aaaaaaa aaaaaaa aaaaaaa").ok,
  false
);

assert.equal(
  analyzeContentQuality("feedback ve loi dang nhap khong hoat dong tren mobile").ok,
  true
);

assert.equal(
  analyzeContentQuality("asdfasdf qwerqwer hjklhjkl spam spam").ok,
  false
);

console.log("✅ content quality tests passed");
