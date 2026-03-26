import path from "path";

export function getStorageRoot() {
  return process.env.STORAGE_ROOT || path.join(process.cwd(), "storage");
}

export function getManualsRoot() {
  return path.join(getStorageRoot(), "manuals");
}
