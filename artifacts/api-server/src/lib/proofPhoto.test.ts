import assert from "node:assert/strict";
import test from "node:test";
import { detectImageContentType, isPublicProofPhotoPath } from "./proofPhoto.ts";

test("accepts legacy UUID paths and new JPEG paths", () => {
  assert.equal(isPublicProofPhotoPath("/objects/uploads/56502214-cbd7-4e39-9c83-e5949eacdf55"), true);
  assert.equal(isPublicProofPhotoPath("/objects/uploads/cab92680-fa1a-4fc1-bbae-de60a6b3f06a.jpg"), true);
  assert.equal(isPublicProofPhotoPath("/objects/private/file.jpg"), false);
  assert.equal(isPublicProofPhotoPath("/objects/uploads/../../secret.jpg"), false);
});

test("normalizes supported image metadata", () => {
  assert.equal(detectImageContentType(Buffer.alloc(0), "image/jpg"), "image/jpeg");
  assert.equal(detectImageContentType(Buffer.alloc(0), "image/png; charset=binary"), "image/png");
});

test("detects common image signatures when metadata is generic", () => {
  assert.equal(
    detectImageContentType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "application/octet-stream"),
    "image/jpeg",
  );
  assert.equal(
    detectImageContentType(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "application/octet-stream",
    ),
    "image/png",
  );
  assert.equal(
    detectImageContentType(Buffer.from("RIFF0000WEBP"), "application/octet-stream"),
    "image/webp",
  );
  assert.equal(detectImageContentType(Buffer.from("not an image"), "text/plain"), null);
});