import { ehIOS } from "@/lib/instalacao";

test("detecta iPhone", () => {
  expect(ehIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
});

test("detecta iPad", () => {
  expect(ehIOS("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
});

test("Android não é iOS", () => {
  expect(ehIOS("Mozilla/5.0 (Linux; Android 13)")).toBe(false);
});
