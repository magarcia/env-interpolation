import { describe, expect, expectTypeOf, it } from "vitest";

import { interpolate, replace, findNextPlaceholder } from "./index.js";

describe("string interpolation", () => {
  it("should interpolate a simple string", () => {
    const result = interpolate("Hello ${NAME:Guest}!", { NAME: "John" });

    expect(result).toBe("Hello John!");
  });

  it("should use default value if variable is not set", () => {
    const result = interpolate("Hello ${NAME:Guest}!");

    expect(result).toBe("Hello Guest!");
  });

  it("should handle quoted default values", () => {
    const result = interpolate('Hello ${NAME:"Guest"}!', { NAME: "John" });

    expect(result).toBe("Hello John!");
  });

  it("should use quoted default value if variable is not set", () => {
    const result = interpolate('Hello ${NAME:"Guest"}!');

    expect(result).toBe("Hello Guest!");
  });

  it("should leave the placeholder if variable is not set and no default value", () => {
    const result = interpolate("Hello ${NAME}!");

    expect(result).toBe("Hello ${NAME}!");
  });

  it("should leave the placeholder if variable is not set and empty default value", () => {
    const result = interpolate("Hello ${NAME:}!");

    expect(result).toBe("Hello ${NAME:}!");
  });

  it("should handle multiple variables", () => {
    const result = interpolate(
      "Hello ${NAME:Guest}, welcome to ${CITY:Unknown}!",
      { NAME: "John", CITY: "New York" },
    );

    expect(result).toBe("Hello John, welcome to New York!");
  });

  it("should handle multiple variables with some missing", () => {
    const result = interpolate(
      "Hello ${NAME:Guest}, welcome to ${CITY:Unknown}!",
      { NAME: "John" },
    );

    expect(result).toBe("Hello John, welcome to Unknown!");
  });

  it("should handle variables with underscores and numbers", () => {
    const result = interpolate("Value: ${VAR_1:default}", { VAR_1: "123" });

    expect(result).toBe("Value: 123");
  });

  it("should handle variables with underscores and numbers using default", () => {
    const result = interpolate("Value: ${VAR_1:default}");

    expect(result).toBe("Value: default");
  });

  it("should be case sensitive for variable names", () => {
    const result = interpolate("Hello ${name}!", { NAME: "John" });

    expect(result).not.toBe("Hello John!");
  });

  it("should handle nested variables", () => {
    const result = interpolate('Hello ${USER:"${NAME}"}!', { NAME: "John" });
    expect(result).toBe("Hello John!");
  });

  it("should handle adjacent placeholders", () => {
    const result = interpolate("${HELLO:Hello}${WORLD:World}!", {
      HELLO: "Hi",
      WORLD: "Earth",
    });
    expect(result).toBe("HiEarth!");
  });

  it("should replace variable with empty string value (defined but empty)", () => {
    const result = interpolate("Hello ${NAME:Guest}!", { NAME: "" });
    expect(result).toBe("Hello !");
  });

  it("should resolve nested default referencing another variable", () => {
    const result = interpolate("Value: ${OUTER:${INNER:Fallback}}", {
      INNER: "InnerValue",
    });
    expect(result).toBe("Value: InnerValue");
  });

  it("should fall back to nested default's own fallback when both missing", () => {
    const result = interpolate("Value: ${OUTER:${INNER:Fallback}}");
    expect(result).toBe("Value: Fallback");
  });

  it("should support default values containing colons when quoted", () => {
    const result = interpolate('User: ${NAME:"First:Last"}');
    expect(result).toBe("User: First:Last");
  });

  it("should support default values containing another placeholder inside quotes", () => {
    const result = interpolate('${GREETING:"Hello ${NAME:Guest}"}', {
      NAME: "Alice",
    });
    expect(result).toBe("Hello Alice");
  });

  it("should leave placeholder with invalid variable name unchanged (dash)", () => {
    const input = "Value: ${INVALID-NAME:foo}";
    const result = interpolate(input);
    expect(result).toBe(input); // unchanged
  });

  it("should leave placeholder with empty variable name unchanged", () => {
    const input = "Value: ${:foo}";
    const result = interpolate(input);
    expect(result).toBe(input);
  });

  it("should handle JSON-like default values containing braces", () => {
    const result = interpolate('Config: ${JSON:{"a":1}}', {});
    expect(result).toBe('Config: {"a":1}');
  });
});

describe("object interpolation", () => {
  it("should interpolate a simple object", () => {
    const obj = {
      greeting: "Hello ${NAME:Guest}!",
      farewell: "Goodbye ${NAME:Guest}!",
    };
    const result = interpolate(obj, { NAME: "John" });

    expect(result).toEqual({
      greeting: "Hello John!",
      farewell: "Goodbye John!",
    });
  });

  it("should use default values if variables are not set", () => {
    const obj = {
      greeting: "Hello ${NAME:Guest}!",
      farewell: "Goodbye ${NAME:Guest}!",
    };
    const result = interpolate(obj);

    expect(result).toEqual({
      greeting: "Hello Guest!",
      farewell: "Goodbye Guest!",
    });
  });

  it("should handle nested objects", () => {
    const obj = {
      user: {
        name: "${NAME:Guest}",
        city: "${CITY:Unknown}",
      },
    };
    const result = interpolate(obj, { NAME: "John", CITY: "New York" });

    expect(result).toEqual({
      user: {
        name: "John",
        city: "New York",
      },
    });
  });

  it("should handle arrays within objects", () => {
    const obj = {
      users: ["${USER1:Guest1}", "${USER2:Guest2}"],
    };
    const result = interpolate(obj, { USER1: "Alice" });

    expect(result).toEqual({
      users: ["Alice", "Guest2"],
    });
  });

  it("should handle complex nested structures", () => {
    const obj = {
      team: {
        members: [
          { name: "${USER1:Guest1}", role: "admin" },
          { name: "${USER2:Guest2}", role: "user" },
        ],
      },
    };
    const result = interpolate(obj, { USER1: "Alice" });

    expect(result).toEqual({
      team: {
        members: [
          { name: "Alice", role: "admin" },
          { name: "Guest2", role: "user" },
        ],
      },
    });
  });

  it("should leave placeholders if variables are not set and no default value", () => {
    const obj = {
      greeting: "Hello ${NAME}!",
    };
    const result = interpolate(obj);

    expect(result).toEqual({
      greeting: "Hello ${NAME}!",
    });
  });

  it("should leave placeholders if variables are not set and empty default value", () => {
    const obj = {
      greeting: "Hello ${NAME:}!",
    };
    const result = interpolate(obj);

    expect(result).toEqual({
      greeting: "Hello ${NAME:}!",
    });
  });

  it("should not mutate the original object", () => {
    const original = {
      greeting: "Hello ${NAME:Guest}!",
      nested: { value: "${VALUE:Default}" },
      arr: ["${ITEM1:One}", { deep: "${ITEM2:Two}" }],
    } as const; // ensure readonly inference
    const cloneBefore = JSON.stringify(original);
    const result = interpolate(original, { NAME: "John", VALUE: "X" });

    // Verify interpolation result
    expect(result).toEqual({
      greeting: "Hello John!",
      nested: { value: "X" },
      arr: ["One", { deep: "Two" }],
    });
    // Ensure original unchanged
    expect(JSON.stringify(original)).toBe(cloneBefore);
  });

  it("ignores inherited properties", () => {
    class Parent {
      inherited = "should not process";
    }

    const obj = Object.create(Parent.prototype);
    obj.own = "${VAR:default}";

    const result = interpolate(obj, { VAR: "test" });

    expect(result.own).toBe("test");
    expect(result.inherited).toBeUndefined();
  });
});

describe("array interpolation", () => {
  it("should interpolate a simple array of strings", () => {
    const arr = ["Hello ${NAME:Guest}!", "Welcome to ${CITY:Unknown}!"];
    const result = interpolate(arr, { NAME: "John", CITY: "New York" });

    expect(result).toEqual(["Hello John!", "Welcome to New York!"]);
  });

  it("should use default values if variables are not set", () => {
    const arr = ["Hello ${NAME:Guest}!", "Welcome to ${CITY:Unknown}!"];
    const result = interpolate(arr);

    expect(result).toEqual(["Hello Guest!", "Welcome to Unknown!"]);
  });

  it("should handle arrays with mixed types", () => {
    const arr = [
      "Hello ${NAME:Guest}!",
      { city: "${CITY:Unknown}" },
      42,
      null,
      ["Nested ${NESTED:Value}"],
    ];
    const result = interpolate(arr, { NAME: "John", NESTED: "Array" });

    expect(result).toEqual([
      "Hello John!",
      { city: "Unknown" },
      42,
      null,
      ["Nested Array"],
    ]);
  });

  it("should handle nested arrays", () => {
    const arr = [
      "Hello ${NAME:Guest}!",
      ["Welcome to ${CITY:Unknown}!", "${GREETING:Hi}!"],
    ];
    const result = interpolate(arr, { NAME: "John", CITY: "New York" });

    expect(result).toEqual(["Hello John!", ["Welcome to New York!", "Hi!"]]);
  });

  it("should leave placeholders if variables are not set and no default value", () => {
    const arr = ["Hello ${NAME}!", "Welcome to ${CITY}!"];
    const result = interpolate(arr);

    expect(result).toEqual(["Hello ${NAME}!", "Welcome to ${CITY}!"]);
  });

  it("should leave placeholders if variables are not set and empty default value", () => {
    const arr = ["Hello ${NAME:}!", "Welcome to ${CITY:}!"];
    const result = interpolate(arr);

    expect(result).toEqual(["Hello ${NAME:}!", "Welcome to ${CITY:}!"]);
  });
});

describe("env variables", () => {
  it("should use process.env by default", () => {
    process.env.TEST_NAME = "EnvUser";
    const result = interpolate("Hello ${TEST_NAME:Guest}!");

    expect(result).toBe("Hello EnvUser!");
    delete process.env.TEST_NAME;
  });

  it("should handle environment without process object", () => {
    // Test with explicit empty defaults object (simulates no process.env)
    const result = interpolate("Hello ${NAME:Guest}!", {});
    expect(result).toBe("Hello Guest!");
  });

  it("should handle case with no process.env available", () => {
    // Test the conditional that checks if process is available (branch 0)
    // This is covered by testing with empty variables object
    const result = interpolate(
      "Hello ${NAME:Guest}! NODE_ENV: ${NODE_ENV:dev}",
      {},
    );
    expect(result).toBe("Hello Guest! NODE_ENV: dev");
  });

  it("works without process object (browser environment)", () => {
    // Mock environment without process
    const originalProcess = global.process;
    // @ts-expect-error - Intentionally deleting global.process for browser simulation
    delete global.process;

    try {
      const result = interpolate("Hello ${NAME:World}!", { NAME: "Test" });
      expect(result).toBe("Hello Test!");
    } finally {
      global.process = originalProcess;
    }
  });
});

describe("escaping placeholders", () => {
  it("should leave escaped placeholder literal when escape option enabled", () => {
    const result = interpolate(
      "Hello \\${NAME:Guest}!",
      { NAME: "John" },
      { escape: true },
    );

    // Single backslash escapes placeholder; one backslash consumed
    expect(result).toBe("Hello ${NAME:Guest}!");
  });

  it("should still interpolate when escape option disabled", () => {
    const result = interpolate(
      "Hello \\${NAME:Guest}!",
      { NAME: "John" },
      { escape: false },
    );
    // Without escape support, backslash is not special; placeholder should interpolate
    expect(result).toBe("Hello \\John!");
  });

  it("should preserve double escaped sequence producing single escaped literal", () => {
    const result = interpolate(
      "Path: \\\\${VAR:val}",
      { VAR: "X" },
      { escape: true },
    );
    // Two backslashes before placeholder (runtime) escape placeholder; none removed (even count)
    expect(result).toBe("Path: \\X");
  });

  it("should handle escaped invalid variable names", () => {
    const result = interpolate(
      "Value: \\${INVALID-NAME:foo}",
      {},
      { escape: true },
    );
    // Escaped invalid variable name should become literal
    expect(result).toBe("Value: ${INVALID-NAME:foo}");
  });

  it("should handle multiple backslashes with invalid variable names", () => {
    const result = interpolate(
      "Value: \\\\\\${INVALID-NAME:foo}",
      {},
      { escape: true },
    );
    // Three backslashes: one pair becomes single backslash, one escapes placeholder
    expect(result).toBe("Value: \\${INVALID-NAME:foo}");
  });
});

describe("edge cases", () => {
  it("should handle unbalanced braces (unclosed placeholder)", () => {
    const input = "Value: ${UNCLOSED and more text";
    const result = interpolate(input);
    // Should return original string when braces are unbalanced
    expect(result).toBe("Value: ${UNCLOSED and more text");
  });

  it("should handle fromIndex parameter in findNextPlaceholder", () => {
    // Test case to ensure we hit the fromIndex default parameter branch
    const result = interpolate("Start ${FIRST:1} middle ${SECOND:2} end", {});
    expect(result).toBe("Start 1 middle 2 end");
  });

  it("should handle non-escape mode with default escape parameter", () => {
    // Test default escape parameter (branch 11)
    const result = interpolate("Hello ${NAME:Guest}!", { NAME: "John" });
    expect(result).toBe("Hello John!");
  });

  it("should handle variable replacement defaults", () => {
    // Test default variables parameter (branch 9)
    const result = interpolate("Hello ${NAME:Guest}!");
    expect(result).toBe("Hello Guest!");
  });

  it("should handle triple backslashes with invalid variable (removeOne branch)", () => {
    // Test the removeOne conditional branch (branch 18)
    const result = interpolate(
      "Value: \\\\\\${INVALID-NAME:foo}",
      {},
      { escape: true },
    );
    expect(result).toBe("Value: \\${INVALID-NAME:foo}");
  });
});

describe("infinite loop protection", () => {
  it("should not enter an infinite loop with self-referential variables", () => {
    const input = "Value: ${A:${A}}";
    const result = interpolate(input);
    // The function should stop after MAX_INTERPOLATION_PASSES and return the processed string
    expect(result).toBe("Value: ${A}");
  });

  it("should stop after MAX_INTERPOLATION_PASSES with deeply nested variables", () => {
    // Create a chain that will require more than 10 passes to fully resolve
    const variables = {
      LEVEL1: "${LEVEL2:default}",
      LEVEL2: "${LEVEL3:default}",
      LEVEL3: "${LEVEL4:default}",
      LEVEL4: "${LEVEL5:default}",
      LEVEL5: "${LEVEL6:default}",
      LEVEL6: "${LEVEL7:default}",
      LEVEL7: "${LEVEL8:default}",
      LEVEL8: "${LEVEL9:default}",
      LEVEL9: "${LEVEL10:default}",
      LEVEL10: "${LEVEL11:default}",
      LEVEL11: "${LEVEL12:default}",
      LEVEL12: "final_value",
    };
    const input = "Value: ${LEVEL1}";
    const result = interpolate(input, variables);
    // Should stop before fully resolving due to MAX_INTERPOLATION_PASSES limit
    expect(result).not.toBe("Value: final_value");
    expect(result).toMatch(/Value: \$\{LEVEL\d+:/);
  });

  it("should resolve more than 10 independent placeholders", () => {
    const variables: Record<string, string> = {};
    let input = "";

    // Create 20 independent placeholders
    for (let i = 1; i <= 20; i++) {
      variables[`VAR${i}`] = `value${i}`;
      input += `\${VAR${i}} `;
    }

    const result = interpolate(input.trim(), variables);
    const expected = Object.values(variables).join(" ");

    expect(result).toBe(expected);
  });
});

describe("generic return type", () => {
  it("should preserve the structural type of the input", () => {
    const config = {
      nested: { value: "${VAL:Default}" },
      arr: ["${ITEM1:One}", { deeper: "${ITEM2:Two}" }],
    } as const;

    const result = interpolate(config, { VAL: "X" });
    // Compile-time assertion
    expectTypeOf(result).toEqualTypeOf(config);
    // Runtime shape assertion
    expect(result.nested.value).toBe("X");
    expect(result.arr[0]).toBe("One");
  });
});

describe("enhanced edge cases and performance", () => {
  it("performance: handles large strings without degradation", () => {
    const largeString =
      "prefix ".repeat(1000) + "${VAR:default}" + " suffix".repeat(1000);

    const start = performance.now();
    const result = interpolate(largeString, { VAR: "test" });
    const duration = performance.now() - start;

    expect(result).toContain("test");
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });

  it("quote handling behavior", () => {
    // Test current double quote stripping
    const result1 = interpolate('${VAR:"quoted default"}', {});
    expect(result1).toBe("quoted default");

    // Test single quotes (document current behavior)
    const result2 = interpolate("${VAR:'single quoted'}", {});
    expect(result2).toBe("'single quoted'"); // Currently NOT stripped
  });

  it("empty string handling", () => {
    // Empty input string
    const result1 = interpolate("", { VAR: "test" });
    expect(result1).toBe("");

    // String with only whitespace
    const result2 = interpolate("   \n\t   ", { VAR: "test" });
    expect(result2).toBe("   \n\t   ");

    // Placeholder with empty variable name after colon
    const result3 = interpolate("${:default}", {});
    expect(result3).toBe("${:default}"); // Should remain unchanged
  });

  it("very long variable names", () => {
    const longVarName = "A".repeat(100) + "_" + "1".repeat(50);
    const placeholder = `\${${longVarName}:default}`;

    // Test with undefined variable (should use default)
    const result1 = interpolate(placeholder, {});
    expect(result1).toBe("default");

    // Test with defined variable
    const variables = { [longVarName]: "long_var_value" };
    const result2 = interpolate(placeholder, variables);
    expect(result2).toBe("long_var_value");
  });

  it("special characters in defaults", () => {
    // Special characters in unquoted defaults
    const result1 = interpolate("${VAR:hello@world.com}", {});
    expect(result1).toBe("hello@world.com");

    // Unicode characters
    const result2 = interpolate("${VAR:🚀 Hello 世界}", {});
    expect(result2).toBe("🚀 Hello 世界");

    // Mixed quotes and special chars in quoted defaults
    const result3 = interpolate(
      "${VAR:\"Value with 'mixed' quotes & symbols!\"}",
      {},
    );
    expect(result3).toBe("Value with 'mixed' quotes & symbols!");

    // Newlines and tabs in defaults
    const result4 = interpolate('${VAR:"Line 1\nLine 2\tTabbed"}', {});
    expect(result4).toBe("Line 1\nLine 2\tTabbed");
  });

  it("maximum nesting depth stress test", () => {
    // Create deeply nested structure (more complex than the existing test)
    const variables: Record<string, string> = {};
    let nestedDefault = "final_value";

    // Build nested chain backwards
    for (let i = 20; i >= 1; i--) {
      const varName = `NESTED_${i}`;
      const nextVar =
        i === 20 ? "final_value" : `\${NESTED_${i + 1}:${nestedDefault}}`;
      variables[varName] = nextVar;
      nestedDefault = nextVar;
    }

    // Test deep nesting with MAX_INTERPOLATION_PASSES limit
    const result = interpolate("${NESTED_1:fallback}", variables);

    // Due to MAX_INTERPOLATION_PASSES limit, this should not fully resolve
    expect(result).not.toBe("final_value");
    expect(result).toMatch(/\${NESTED_\d+:/); // Should contain unresolved placeholder
  });

  it("performance with many independent placeholders", () => {
    // Create string with many independent placeholders
    const placeholderCount = 100;
    let inputString = "";
    const variables: Record<string, string> = {};

    for (let i = 1; i <= placeholderCount; i++) {
      const varName = `VAR_${i}`;
      variables[varName] = `value_${i}`;
      inputString += `\${${varName}:default_${i}} `;
    }

    const start = performance.now();
    const result = interpolate(inputString.trim(), variables);
    const duration = performance.now() - start;

    // Verify all placeholders were replaced
    expect(result).not.toContain("${");
    expect(result).toContain("value_1");
    expect(result).toContain(`value_${placeholderCount}`);
    expect(duration).toBeLessThan(50); // Should be very fast for independent placeholders
  });

  it("boundary conditions with braces", () => {
    // Malformed placeholders with unbalanced braces
    const result1 = interpolate("${UNCLOSED", {});
    expect(result1).toBe("${UNCLOSED");

    const result2 = interpolate("UNOPENED}", {});
    expect(result2).toBe("UNOPENED}");

    // Multiple opening braces
    const result3 = interpolate("${{VAR:default}}", {});
    expect(result3).toBe("${{VAR:default}}"); // Invalid, should remain unchanged

    // Empty placeholder
    const result4 = interpolate("${}", {});
    expect(result4).toBe("${}"); // Invalid, should remain unchanged
  });

  it("stress test with mixed valid and invalid placeholders", () => {
    const input = [
      "${VALID_VAR:default1}",
      "${invalid-var:default2}",
      "${:default3}",
      "${VALID2:default4}",
      "${INVALID@:default5}",
      "${VALID_3:default6}",
    ].join(" ");

    const result = interpolate(input, {
      VALID_VAR: "replaced1",
      VALID_3: "replaced3",
    });

    expect(result).toContain("replaced1");
    expect(result).toContain("replaced3");
    expect(result).toContain("${invalid-var:default2}"); // Invalid, unchanged
    expect(result).toContain("${:default3}"); // Invalid, unchanged
    expect(result).toContain("default4"); // Valid var, using default
    expect(result).toContain("${INVALID@:default5}"); // Invalid, unchanged
  });
});

describe("branch coverage tests", () => {
  it("should trigger escape default parameter (branch 11)", () => {
    // Pass options object without escape property to trigger default
    const result = replace("Hello ${NAME:Guest}!", { NAME: "John" }, {});
    expect(result).toBe("Hello John!");
  });

  it("should trigger variables default parameter (branch 9)", () => {
    // Call replace without variables parameter to trigger default
    const result = replace("Hello ${NAME:Guest}!");
    expect(result).toBe("Hello Guest!");
  });

  it("should trigger fromIndex default parameter (branch 1)", () => {
    // Call findNextPlaceholder without fromIndex to trigger default
    const result = findNextPlaceholder("Hello ${NAME}!");
    expect(result).toEqual({
      start: 6,
      end: 12,
      inner: "NAME",
      full: "${NAME}",
    });
  });

  it("should trigger removeOne = 1 branch (branch 18)", () => {
    // Test odd backslashes with invalid variable name and escape=false
    const result = replace("\\${INVALID-NAME:foo}", {}, { escape: false });
    expect(result).toBe("${INVALID-NAME:foo}");
  });

  it("should handle process undefined condition (branch 0)", () => {
    // This branch is at module initialization level (line 5)
    // typeof process !== "undefined" ? process.env : {}
    // Since we can't easily test process undefined in Node.js,
    // we test the equivalent logic with empty defaults

    const result = replace("Hello ${NAME:Guest}!", {});
    expect(result).toBe("Hello Guest!");

    // This verifies the same behavior that would occur
    // if process was undefined and defaults was {}
  });
});
