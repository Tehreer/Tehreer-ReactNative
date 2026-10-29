// Reading and checking benchmarks/scenarios.json, which all three runners (example/benchmark,
// benchmarks/android, benchmarks/cocoa) read. The text expansion here is the reference; the runners
// repeat it in their own language and print the length they got (a test compares it with `characters`).

const METRICS = ["layoutMs", "drawMs", "memLayoutKB"];

function fail(message) {
  throw new Error(`scenarios: ${message}`);
}

function positiveInteger(value, what) {
  if (!Number.isInteger(value) || value < 1) fail(`${what} must be a positive integer`);
}

function checkCounts(counts, what) {
  if (typeof counts !== "object" || counts === null) fail(`${what} is missing`);
  if (!Number.isInteger(counts.warmup) || counts.warmup < 0) fail(`${what}.warmup must be a non-negative integer`);
  positiveInteger(counts.iterations, `${what}.iterations`);
}

/** The text of a scenario: its segments, in order, `repeat` times. */
export function expandText(scenario) {
  const unit = scenario.segments.map((segment) => segment.text).join("");
  return unit.repeat(scenario.repeat);
}

/** The `[start, end, font]` ranges of the expanded text, in UTF-16 code units. */
export function expandRuns(scenario) {
  const runs = [];
  let offset = 0;
  for (let i = 0; i < scenario.repeat; i++) {
    for (const segment of scenario.segments) {
      runs.push([offset, offset + segment.text.length, segment.font]);
      offset += segment.text.length;
    }
  }
  return runs;
}

/** Throws a descriptive Error unless `definition` is a well formed scenario file; returns it. */
export function validateScenarios(definition) {
  if (typeof definition !== "object" || definition === null) fail("the file must be an object");
  if (definition.schema !== 1) fail("schema must be 1");
  if (typeof definition.fontsDirectory !== "string") fail("fontsDirectory must be a string");
  const fonts = definition.fonts;
  if (typeof fonts !== "object" || fonts === null || Object.keys(fonts).length === 0) fail("fonts must name at least one font");
  for (const [name, file] of Object.entries(fonts)) {
    if (typeof file !== "string" || !file.endsWith(".ttf")) fail(`font ${name} must be a .ttf file name`);
  }
  if (typeof definition.frameHeight !== "number" || !(definition.frameHeight > 0)) fail("frameHeight must be positive");
  if (!Array.isArray(definition.scenarios) || definition.scenarios.length === 0) fail("scenarios must not be empty");

  const ids = new Set();
  for (const scenario of definition.scenarios) {
    const id = scenario.id;
    if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) fail(`scenario id ${String(id)} must be lowercase kebab case`);
    if (ids.has(id)) fail(`duplicate scenario id ${id}`);
    ids.add(id);
    if (!Array.isArray(scenario.segments) || scenario.segments.length === 0) fail(`${id}: segments must not be empty`);
    for (const segment of scenario.segments) {
      if (!(segment.font in fonts)) fail(`${id}: unknown font ${String(segment.font)}`);
      if (typeof segment.text !== "string" || segment.text.length === 0) fail(`${id}: a segment needs text`);
    }
    positiveInteger(scenario.repeat, `${id}.repeat`);
    if (typeof scenario.typeSize !== "number" || !(scenario.typeSize > 0)) fail(`${id}.typeSize must be positive`);
    if (typeof scenario.width !== "number" || !(scenario.width > 0)) fail(`${id}.width must be positive`);
    checkCounts(scenario.layout, `${id}.layout`);
    checkCounts(scenario.draw, `${id}.draw`);
    const length = expandText(scenario).length;
    if (scenario.characters !== length) fail(`${id}: characters is ${scenario.characters} but the text has ${length}`);
  }
  return definition;
}

export { METRICS };
