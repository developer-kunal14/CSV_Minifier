const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { format } = require("@fast-csv/format");

function splitter() {
  return new Promise((resolve, reject) => {
    const inputDir = path.join(__dirname, "input");
    const ROWS_PER_FILE = 1_000_000;

    fs.readdir(inputDir, (err, files) => {
      if (err) {
        console.error("❌ Error reading input directory:", err);
        return reject("Error reading input directory");
      }

      const csvFile = files.find(file => file.endsWith(".csv"));

      if (!csvFile) {
        console.error("❌ No CSV file found in the input directory.");
        return reject("No CSV file found");
      }

      const inputFilePath = path.join(inputDir, csvFile);

      let currentFileIndex = 1;
      let currentRowCount = 0;
      let outputStream;
      let csvStream;

      function createNewOutputStream(index) {
        const targetedDir = path.join(__dirname, "output");
        const outputFileName = `output_part_${index}.csv`;
        const fullPath = path.join(targetedDir, outputFileName);

        fs.mkdirSync(targetedDir, { recursive: true });

        outputStream = fs.createWriteStream(fullPath);
        csvStream = format({ headers: true });
        csvStream.pipe(outputStream);
        console.log(`📁 Writing to ${outputFileName}`);
      }

      createNewOutputStream(currentFileIndex);

      fs.createReadStream(inputFilePath)
        .pipe(csv())
        .on("data", (row) => {
          if (currentRowCount >= ROWS_PER_FILE) {
            csvStream.end();
            currentFileIndex++;
            currentRowCount = 0;
            createNewOutputStream(currentFileIndex);
          }

          csvStream.write(row);
          currentRowCount++;
        })
        .on("end", () => {
          csvStream.end();

          // Delete all input files
          fs.readdir(inputDir, (err, files) => {
            if (err) {
              console.error("❌ Error reading directory:", err);
              return reject("Error cleaning input files");
            }

            for (const file of files) {
              fs.unlink(path.join(inputDir, file), (err) => {
                if (err) console.error(`❌ Error deleting ${file}:`, err);
                else console.log(`✅ Deleted: ${file}`);
              });
            }

            console.log("✅ CSV splitting complete.");
            resolve("Success");
          });
        })
        .on("error", (err) => {
          console.error("❌ Error reading CSV file:", err);
          reject("Error processing CSV file");
        });
    });
  });
}

module.exports = splitter;
