const express = require("express");
const path = require("path");
const fs = require("fs")
const { upload } = require("./multer.config.js");
const splitter = require("./splitter.js");

const app = express();
const PORT = 5000
app.use(express.json());


app.use(express.static(path.join(__dirname, "public")))
app.use("/downloads", express.static(path.join(__dirname, "output")));

app.get("/", (req, res) => {
    return res.status(200).send("Application is running")
})

app.post("/upload", upload.single("input_file"), async (req, res) => {
    try {
        const result = await splitter();

        if (result === "Success") {
            const outputDir = path.join(__dirname, "output");
            await fs.promises.mkdir(outputDir, { recursive: true });

            const files = await fs.promises.readdir(outputDir);
            const csvFiles = files.filter(file => file.endsWith(".csv"));

            res.json({
                status: "success",
                files: csvFiles // this is used by the frontend to generate download links
            });
        } else {
            res.status(500).json({ status: "failed", message: "Splitter failed" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.post("/remove-output", async (req, res) => {
    const outputDir = path.join(__dirname, "output")
    fs.readdir(outputDir, (err, files) => {
        if (err) {
            console.error("❌ Error reading directory:", err);
            return reject("Error cleaning input files");
        }

        for (const file of files) {
            fs.unlink(path.join(outputDir, file), (err) => {
                if (err) console.error(`❌ Error deleting ${file}:`, err);
                else console.log(`✅ Deleted: ${file}`);
            });
        }

        console.log("✅ CSV splitting complete.");
        return res.status(200).json({
            message: "Successful!"
        })
    });
})





app.listen(PORT, () => {
    console.log(`http://localhost:5000`)
})