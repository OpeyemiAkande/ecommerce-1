import multer from "multer";
import path from "path";
import fs from "fs/promises";

const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".jpeg", ".jpg", ".png", ".webp"].includes(ext) ? ext : "";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${safeExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLocaleLowerCase()
  );
  const mimeType = allowedTypes.test(file.mimetype);

  if (extname && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg,jpg,png,webp)"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {fileSize: 5 * 1024 * 1024} // 5MB limit per file
});

// Multer writes uploads to disk; call this once they've been sent to Cloudinary.
export async function removeTempFiles(files = []) {
  await Promise.all(
    files.map((file) =>
      fs.unlink(file.path).catch((error) => {
        console.error("Failed to remove temp file:", file.path, error.message);
      })
    )
  );
}
