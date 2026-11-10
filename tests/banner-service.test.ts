import test from "node:test";
import assert from "node:assert/strict";
import { createBannerService, MESSAGES } from "../src/lib/banners/service";
import { selectHeroBanners } from "../src/lib/banners/rules";
import { PNG, fakeFile, makeRow, makeWorld } from "./helpers/banner-fakes";

const fields = { kind: "HERO", title: "New heading", subtitle: "Sub", buttonText: "Shop now", linkUrl: "/shop", altText: "" };

/* ---------------------------------------------------------------- upload */

test("upload: a new banner is saved as a DRAFT and is not on the homepage", async () => {
  const w = makeWorld();
  const svc = createBannerService(w.deps);
  const r = await svc.create(fields, fakeFile(), false);
  assert.equal(r.ok, true);
  const saved = [...w.rows.values()][0];
  assert.equal(saved.isActive, false);
  assert.match(saved.imageUrl, /^https:\/\/res\.cloudinary\.com\//);
  assert.ok(saved.imagePublicId);
  assert.equal(selectHeroBanners([...w.rows.values()]).length, 0);
});

test("upload: 'Publish now' makes it appear on the homepage", async () => {
  const w = makeWorld();
  const r = await createBannerService(w.deps).create(fields, fakeFile({ type: "image/png", header: [...PNG] }), true);
  assert.equal(r.ok, true);
  assert.equal(selectHeroBanners([...w.rows.values()]).length, 1);
});

test("upload: new banners go to the end of their own list", async () => {
  const w = makeWorld([makeRow({ id: "a", sortOrder: 0 }), makeRow({ id: "b", sortOrder: 4 }), makeRow({ id: "p", kind: "PROMO", sortOrder: 9 })]);
  await createBannerService(w.deps).create(fields, fakeFile(), true);
  const added = [...w.rows.values()].find((r) => r.id.startsWith("new"))!;
  assert.equal(added.sortOrder, 5);
});

test("upload: invalid file is rejected BEFORE anything is uploaded or saved", async () => {
  const w = makeWorld();
  const svc = createBannerService(w.deps);
  const bad = [
    fakeFile({ type: "image/gif" }),
    fakeFile({ size: 4 * 1024 * 1024 + 1 }),
    new Blob(["<html>"], { type: "image/jpeg" }),
    null,
  ];
  for (const f of bad) {
    const r = await svc.create(fields, f, true);
    assert.equal(r.ok, false);
  }
  assert.deepEqual(w.calls, []);
});

test("upload: invalid text fields are rejected before any upload", async () => {
  const w = makeWorld();
  const r = await createBannerService(w.deps).create({ ...fields, linkUrl: "javascript:alert(1)" }, fakeFile(), true);
  assert.equal(r.ok, false);
  assert.deepEqual(w.calls, []);
});

test("upload failure: safe message, no row saved, internal details not leaked", async () => {
  const w = makeWorld();
  w.flags.uploadFails = true;
  const r = await createBannerService(w.deps).create(fields, fakeFile(), true);
  assert.deepEqual(r, { ok: false, error: MESSAGES.uploadFailed });
  assert.equal(w.rows.size, 0);
  assert.ok(!JSON.stringify(r).includes("secret"));
});

test("upload: if saving fails after the upload, the orphan image is cleaned up", async () => {
  const w = makeWorld();
  w.flags.dbCreateFails = true;
  const r = await createBannerService(w.deps).create(fields, fakeFile(), true);
  assert.equal(r.ok, false);
  assert.equal(w.removed.length, 1);
});

/* ----------------------------------------------------------- replacement */

test("replace: new image is uploaded and saved BEFORE the old one is deleted", async () => {
  const w = makeWorld([makeRow()]);
  const r = await createBannerService(w.deps).replaceImage("b1", fakeFile());
  assert.equal(r.ok, true);
  assert.deepEqual(w.calls, ["storage.upload", "db.update", "storage.remove:banners/old"]);
  const row = w.rows.get("b1")!;
  assert.notEqual(row.imageUrl, "https://res.cloudinary.com/demo/old.jpg");
  assert.equal(row.title, "Old heading"); // text untouched by an image-only replacement
  assert.equal(row.isActive, true);       // and it stays published
});

test("replace: when the upload fails the current image stays published and is NOT deleted", async () => {
  const w = makeWorld([makeRow()]);
  w.flags.uploadFails = true;
  const r = await createBannerService(w.deps).replaceImage("b1", fakeFile());
  assert.equal(r.ok, false);
  assert.deepEqual(w.calls, ["storage.upload"]);
  assert.equal(w.rows.get("b1")!.imageUrl, "https://res.cloudinary.com/demo/old.jpg");
  assert.deepEqual(w.removed, []);
});

test("replace: when saving fails the old image is kept and the new upload is discarded", async () => {
  const w = makeWorld([makeRow()]);
  w.flags.dbUpdateFails = true;
  const r = await createBannerService(w.deps).replaceImage("b1", fakeFile());
  assert.equal(r.ok, false);
  assert.ok(!w.removed.includes("banners/old"));
  assert.equal(w.removed.length, 1); // only the NEW upload was removed
  assert.equal(w.rows.get("b1")!.imagePublicId, "banners/old");
});

test("replace: an invalid replacement file changes nothing", async () => {
  const w = makeWorld([makeRow()]);
  const r = await createBannerService(w.deps).replaceImage("b1", fakeFile({ type: "image/gif" }));
  assert.equal(r.ok, false);
  assert.deepEqual(w.calls, []);
});

test("replace: failing to delete the old file does not fail the replacement", async () => {
  const w = makeWorld([makeRow()]);
  w.flags.storageRemoveFails = true;
  const r = await createBannerService(w.deps).replaceImage("b1", fakeFile());
  assert.equal(r.ok, true);
  assert.equal(w.logs.length, 1);
});

test("replace: banners created before this feature (no stored image id) can still be replaced", async () => {
  const w = makeWorld([makeRow({ imagePublicId: null })]);
  const r = await createBannerService(w.deps).replaceImage("b1", fakeFile());
  assert.equal(r.ok, true);
  assert.deepEqual(w.calls, ["storage.upload", "db.update"]);
});

test("edit: text, button and link can be changed without touching the image", async () => {
  const w = makeWorld([makeRow()]);
  const r = await createBannerService(w.deps).update("b1", { ...fields, title: "Edited" }, null);
  assert.equal(r.ok, true);
  assert.deepEqual(w.calls, ["db.update"]);
  assert.equal(w.rows.get("b1")!.title, "Edited");
  assert.equal(w.rows.get("b1")!.imagePublicId, "banners/old");
});

test("edit: unknown banner and invalid fields are rejected", async () => {
  const w = makeWorld([makeRow()]);
  const svc = createBannerService(w.deps);
  assert.deepEqual(await svc.update("nope", fields, null), { ok: false, error: MESSAGES.notFound });
  assert.equal((await svc.update("b1", { ...fields, title: "x".repeat(500) }, null)).ok, false);
});

/* --------------------------------------------------------------- removal */

test("remove: the banner is deleted and then its image is cleaned up", async () => {
  const w = makeWorld([makeRow()]);
  const r = await createBannerService(w.deps).remove("b1");
  assert.equal(r.ok, true);
  assert.deepEqual(w.calls, ["db.remove", "storage.remove:banners/old"]);
  assert.equal(w.rows.size, 0);
});

test("remove: an image that cannot be deleted does not block removal", async () => {
  const w = makeWorld([makeRow()]);
  w.flags.storageRemoveFails = true;
  assert.equal((await createBannerService(w.deps).remove("b1")).ok, true);
  assert.equal(w.rows.size, 0);
});

test("remove: unknown id reports a clear error and deletes nothing", async () => {
  const w = makeWorld([makeRow()]);
  assert.deepEqual(await createBannerService(w.deps).remove("zzz"), { ok: false, error: MESSAGES.notFound });
  assert.equal(w.rows.size, 1);
});

/* ------------------------------------------- publish, disable and reorder */

test("publish / unpublish controls what the homepage shows", async () => {
  const w = makeWorld([makeRow({ isActive: false })]);
  const svc = createBannerService(w.deps);
  assert.equal(selectHeroBanners([...w.rows.values()]).length, 0);
  await svc.setActive("b1", true);
  assert.equal(selectHeroBanners([...w.rows.values()]).length, 1);
  await svc.setActive("b1", false);
  assert.equal(selectHeroBanners([...w.rows.values()]).length, 0);
});

test("reorder: move up / down changes the order visitors see", async () => {
  const w = makeWorld([makeRow({ id: "a", sortOrder: 0 }), makeRow({ id: "b", sortOrder: 1 }), makeRow({ id: "c", sortOrder: 2 })]);
  const svc = createBannerService(w.deps);
  await svc.move("c", "up");
  assert.deepEqual(selectHeroBanners([...w.rows.values()]).map((r) => r.id), ["a", "c", "b"]);
  await svc.move("a", "down");
  assert.deepEqual(selectHeroBanners([...w.rows.values()]).map((r) => r.id), ["c", "a", "b"]);
});

test("reorder: only moves among banners of the same type; edges are a harmless no-op", async () => {
  const w = makeWorld([makeRow({ id: "a", sortOrder: 0 }), makeRow({ id: "p", kind: "PROMO", sortOrder: 1 })]);
  const svc = createBannerService(w.deps);
  assert.equal((await svc.move("a", "down")).ok, true);
  assert.ok(!w.calls.includes("db.setOrder"));
});

/* ----------------------------------------------------------- permissions */

test("permissions: every operation refuses a non-admin and touches NOTHING", async () => {
  const w = makeWorld([makeRow()]);
  w.flags.admin = false;
  const svc = createBannerService(w.deps);
  const results = [
    await svc.create(fields, fakeFile(), true),
    await svc.update("b1", fields, fakeFile()),
    await svc.replaceImage("b1", fakeFile()),
    await svc.setActive("b1", false),
    await svc.remove("b1"),
    await svc.move("b1", "up"),
  ];
  for (const r of results) assert.deepEqual(r, { ok: false, error: MESSAGES.unauthorized });
  assert.deepEqual(w.calls, []);
  assert.equal(w.rows.get("b1")!.title, "Old heading");
});

test("permissions: the admin check runs first, so a non-admin cannot probe for banners", async () => {
  const w = makeWorld([makeRow()]);
  w.flags.admin = false;
  const svc = createBannerService(w.deps);
  assert.deepEqual(await svc.remove("does-not-exist"), { ok: false, error: MESSAGES.unauthorized });
});

test("permissions: if identifying the admin itself fails, access is denied (fail closed)", async () => {
  const w = makeWorld([makeRow()]);
  const svc = createBannerService({ ...w.deps, requireAdmin: async () => { throw new Error("session service down"); } });
  assert.equal((await svc.remove("b1")).ok, false);
  assert.equal(w.rows.size, 1);
});
