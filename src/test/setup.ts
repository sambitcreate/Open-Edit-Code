import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { useAppStore } from "@/lib/state/store";

afterEach(() => {
  cleanup();
  useAppStore.persist.clearStorage();
});
