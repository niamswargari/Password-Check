// Benchmark for Password Check.
// Run from the "Password Check" folder:  node tools/benchmark.mjs
//
// It does not copy the scoring logic. It reads src/App.jsx, extracts the CRITERIA list, the
// STRENGTH_LEVELS list, the useMemo analysis body and the generateStrongPassword function,
// and runs those exact lines, so the numbers always match the code in the repository.
// If App.jsx is reorganised, update the marker strings in extract() below.

import fs from "node:fs";

const appPath = new URL("../src/App.jsx", import.meta.url);
const src = fs.readFileSync(appPath, "utf8");

function extract(startMarker, endMarker, keepEnd) {
  const i = src.indexOf(startMarker);
  if (i < 0) throw new Error("marker not found: " + startMarker);
  const j = src.indexOf(endMarker, i + startMarker.length);
  if (j < 0) throw new Error("end marker not found: " + endMarker);
  return src.slice(keepEnd ? i : i + startMarker.length, keepEnd ? j + endMarker.length : j);
}

const criteriaSrc = extract("const CRITERIA = [", "\n];", true);
const levelsSrc = extract("const STRENGTH_LEVELS = [", "\n];", true);
const analysisBody = extract("const analysis = useMemo(() => {", "\n  }, [password]);", false);
const generatorBody = extract("const generateStrongPassword = () => {", "\n  };", false);

const analyse = new Function("password", `${criteriaSrc}\n${levelsSrc}\n${analysisBody}`);
const generateOnce = new Function("setPassword", "setShowPassword", "setCopied", generatorBody);

function generate() {
  let out = "";
  generateOnce((v) => { out = v; }, () => {}, () => {});
  return out;
}

const LEVELS = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
const levelIndex = (a) => (a.level ? LEVELS.indexOf(a.level.label) : -1);

const cases = [
  ["T1", "password"],
  ["T2", "Password1!"],
  ["T3", "Qwerty123$"],
  ["T4", "P@ssw0rd"],
  ["T5", "k7#Vq9!zRt2$mXw4"],
  ["T6", ""],
  ["T7", Array.from({ length: 200 }, (_, i) => "aB3$xK9#mQ7!"[(i * 7 + (i >> 2)) % 12]).join("")],
];
console.log("Case results");
for (const [id, pw] of cases) {
  const a = analyse(pw);
  const passed = a.results.filter((r) => r.passed).length;
  console.log(
    `${id}  input=${JSON.stringify(pw.length > 24 ? pw.slice(0, 12) + "...(" + pw.length + " chars)" : pw)}  ` +
      `criteria passed=${passed}/6  rating=${a.level ? a.level.label : "None"}  entropy=${a.entropy} bits`
  );
}

const predictable = [
  "Password1!", "Qwerty123$", "Welcome@2024", "Admin@123", "Iloveyou1!",
  "P@ssw0rd", "Summer2024!", "Letmein#123", "Monkey@123", "Dragon$1234",
  "Football#1", "Sunshine@99", "Princess1!", "Shadow@2020", "India@1947",
  "Delhi@12345", "Cricket#2011", "Master@123", "Qazwsx@123", "Abc@12345",
  "Passw0rd!", "Hello@1234", "Baseball1!", "Superman#1", "Trustno1!",
  "Winter@2023", "Test@1234", "Admin#2025", "Login@123", "Asdfgh@123",
];
const rows = predictable.map((pw) => ({ pw, a: analyse(pw) }));
const counts = Object.fromEntries(LEVELS.map((l) => [l, 0]));
for (const r of rows) counts[r.a.level.label]++;
const strongOrBetter = rows.filter((r) => levelIndex(r.a) >= 3).length;
const meanEntropy = rows.reduce((s, r) => s + r.a.entropy, 0) / rows.length;
console.log("\nPredictable, rule-compliant passwords:", predictable.length);
console.log("Rating counts:", JSON.stringify(counts));
console.log(`Rated Strong or Very Strong: ${strongOrBetter} of ${predictable.length}`);
console.log(`Mean displayed entropy: ${meanEntropy.toFixed(1)} bits`);

const runs = 1000;
const generated = Array.from({ length: runs }, generate);
const allLen16 = generated.every((p) => p.length === 16);
const allCats = generated.every((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p));
const distinct = new Set(generated).size;
const genRatings = Object.fromEntries(LEVELS.map((l) => [l, 0]));
for (const p of generated) genRatings[analyse(p).level.label]++;
const genEntropy = generated.map((p) => analyse(p).entropy);
console.log(`\nGenerator, ${runs} runs: all 16 characters = ${allLen16}; all four character classes = ${allCats}; distinct = ${distinct}`);
console.log("Ratings of generated passwords:", JSON.stringify(genRatings));
console.log(`Displayed entropy of generated passwords: min ${Math.min(...genEntropy)}, max ${Math.max(...genEntropy)} bits`);
console.log("Randomness source in generator code uses Math.random:", /Math\.random/.test(generatorBody),
  "| uses crypto.getRandomValues:", /getRandomValues/.test(generatorBody));


const timingSet = [...predictable, ...generated.slice(0, 20), cases[6][1]];
for (let w = 0; w < 30; w++) for (const pw of timingSet) for (let k = 1; k <= pw.length; k++) analyse(pw.slice(0, k));
const rounds = 200;
let evals = 0;
const t0 = performance.now();
for (let r = 0; r < rounds; r++)
  for (const pw of timingSet)
    for (let k = 1; k <= pw.length; k++) { analyse(pw.slice(0, k)); evals++; }
const ms = (performance.now() - t0) / evals;
console.log(`\nMean time per evaluation: ${ms.toFixed(4)} ms over ${evals} evaluations (${rounds} rounds, every prefix of ${timingSet.length} passwords)`);
console.log("Node version:", process.version);


function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(new URL(e.name + "/", dir)) : [new URL(e.name, dir)]);
}
const srcDir = new URL("../src/", import.meta.url);
const pattern = /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|axios|navigator\.sendBeacon/;
const hits = walk(srcDir).filter((f) => /\.(jsx?|tsx?)$/.test(f.pathname))
  .filter((f) => pattern.test(fs.readFileSync(f, "utf8")));
console.log("\nSource files in src/ containing a network call:", hits.length);

fs.writeFileSync(new URL("./results.csv", import.meta.url),
  "password,criteria_passed,rating,entropy_bits\n" +
  rows.map((r) => `${r.pw},${r.a.results.filter((x) => x.passed).length},${r.a.level.label},${r.a.entropy}`).join("\n") + "\n");
console.log("Wrote tools/results.csv");
