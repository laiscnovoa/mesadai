const PUBLIC_OBJECT_PATH = /^\/objects\/uploads\/[0-9a-f-]{36}(?:\.jpg)?$/i;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export function isPublicProofPhotoPath(path: string): boolean {
  return PUBLIC_OBJECT_PATH.test(path);
}

export function detectImageContentType(
  header: Buffer,
  metadataType?: string,
): string | null {
  const normalizedMetadataType = metadataType?.split(";")[0]?.trim().toLowerCase();
  if (normalizedMetadataType === "image/jpg") {
    return "image/jpeg";
  }
  if (normalizedMetadataType && SUPPORTED_IMAGE_TYPES.has(normalizedMetadataType)) {
    return normalizedMetadataType;
  }
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }
  if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  const sixByteSignature = header.subarray(0, 6).toString("ascii");
  if (sixByteSignature === "GIF87a" || sixByteSignature === "GIF89a") {
    return "image/gif";
  }
  if (header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return null;
}