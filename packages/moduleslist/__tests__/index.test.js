const isGithubUrl = require("is-github-url");

const nonEmptyString = new RegExp("^.+$", "s");

expect.extend({
  toBeAGithubUrl(received) {
    return isGithubUrl(received)
      ? {
          pass: true,
          message: () => `expected ${received} not to be a GitHub URL`,
        }
      : {
          pass: false,
          message: () => `expected ${received} to be a GitHub URL`,
        };
  },
});

// Ensures the data is well formed and each entry has all required properties.
test("moduleslist is well-formed", async () => {
  let modulesList = require("..");
  expect(Array.isArray(modulesList)).toBe(true);
  for (let m of modulesList) {
    // Run some basic checks on each module entry
    expect(typeof m).toBe("object");
    expect(m.category).toMatch(nonEmptyString);
    expect(m.name).toMatch(nonEmptyString);
    expect(m.author).toMatch(nonEmptyString);
    expect(m.description).toMatch(nonEmptyString);
    expect(m.repository).toMatch(nonEmptyString);
    expect(m.repository).toBeAGithubUrl();
  }
});
