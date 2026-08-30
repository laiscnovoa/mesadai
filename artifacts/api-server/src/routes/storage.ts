// Object storage routes (expo_object_storage blueprint).
// Proof photos are uploaded by the child device via a presigned URL and served
// publicly (by obscure UUID path) so any paired device can render them.
import { Router, type IRouter } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { detectImageContentType, isPublicProofPhotoPath } from "../lib/proofPhoto";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// Request a presigned upload URL. Returns the URL to PUT bytes to, plus the
// normalized object path used to construct the public serving URL.
router.post("/objects/upload", requireAuth, async (_req, res) => {
  try {
    const svc = new ObjectStorageService();
    const uploadURL = await svc.getObjectEntityUploadURL();
    const objectPath = svc.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err) {
    res.status(500).json({ error: "Falha ao preparar o upload da foto" });
  }
});

// Only proof-photo uploads are served publicly: /objects/uploads/<uuid>.
// Serve an uploaded object publicly. The path is an unguessable UUID, so no
// authentication is required — this lets <Image> render it on any device.
// Restricted to the uploads/ prefix so nothing else under the private dir leaks.
router.get("/objects/*objectPath", async (req, res) => {
  if (!isPublicProofPhotoPath(req.path)) {
    res.status(404).json({ error: "Foto não encontrada" });
    return;
  }
  const svc = new ObjectStorageService();
  try {
    const objectFile = await svc.getObjectEntityFile(req.path);
    const [metadata] = await objectFile.getMetadata();
    const [header] = await objectFile.download({ start: 0, end: 11 });
    const contentType = detectImageContentType(header, metadata.contentType as string | undefined);
    if (!contentType) {
      res.status(415).json({ error: "Formato de foto não suportado" });
      return;
    }
    res.set("Content-Type", contentType);
    if (metadata.size) {
      res.set("Content-Length", String(metadata.size));
    }
    res.set("Cache-Control", "public, max-age=3600");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    res.set("X-Content-Type-Options", "nosniff");
    objectFile.createReadStream().pipe(res);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Foto não encontrada" });
      return;
    }
    res.status(500).json({ error: "Falha ao carregar a foto" });
  }
});

export default router;
