const assert = require("node:assert/strict");
const { isSimilarText, findSimilarText } = require("../lib/textSimilarity");

const base =
  "feedback ve loi dang nhap khong hoat dong dung tren mobile ios";
const near =
  "feedback ve loi dang nhap khong hoat dong dung tren mobile ios nua";
const different = "ui can them nut export pdf o man hinh bao cao";

assert.equal(isSimilarText(base, near), true);
assert.equal(isSimilarText(base, different), false);
assert.ok(findSimilarText(base, [near]));

console.log("✅ text similarity tests passed");
