import multer from "multer";
import path from "path";

// Define storage options
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "input/"); // Folder to save uploaded files (make sure it exists or create dynamically)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
});

// File type filter (optional)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["text/csv"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only CSV, JSON, and PDF are allowed."), false);
    }
};

// File size limit (e.g., 10MB)
const limits = {
    fileSize: 5000 * 1024 * 1024, // 10 MB
};

// Export middleware
export const upload = multer({
    storage,
    fileFilter,
    limits,
});
