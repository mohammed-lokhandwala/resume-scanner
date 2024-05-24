const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { Console } = require('console');

const app = express();
app.use(cors());

// Create a writable stream to the server.log file
const logFileStream = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });
const logger = new Console({ stdout: logFileStream, stderr: logFileStream });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); // Adjust the upload destination path if needed
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage }).array('files');

app.get("/", (req, res) => {
    console.log("It's working");
    res.send("It's working");
});

app.post('/upload', (req, res) => {
  try {
    upload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error:', err);
        return res.status(400).json({ success: false, message: 'Error uploading file.', error: err.message });
      } else if (err) {
        logger.error('Unknown error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
      }

      const keywords = req.body.keywords.split(',').map(keyword => keyword.trim());
      const files = req.files;

      const results = await Promise.all(files.map(async (file) => {
        if (file.mimetype === 'application/pdf') {
          const filePath = file.path;
          const keywordResults = await Promise.all(keywords.map(async (keyword) => {
            if (await checkKeywordInPDF(filePath, keyword)) {
              logger.log(`File: ${file.originalname}, Keyword: ${keyword}`);
              return true;
            }
            return false;
          }));
          if (keywordResults.some(result => result === true)) {
            return {
              filename: file.originalname,
              keywordFound: true
            };
          }
        }
        return null;
      }));

      const filteredResults = results.filter(result => result !== null);

      res.status(200).json({ success: true, message: 'Files uploaded and scanned successfully.', results: filteredResults });
    });
  } catch (error) {
    logger.error('Error uploading files:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
});

const checkKeywordInPDF = async (filePath, keyword) => {
    try {
      const data = fs.readFileSync(filePath);
      const { text } = await pdfParse(data);
      
      // Convert text content and keyword to lowercase for case-insensitive comparison
      const lowerCaseText = text.toLowerCase();
      const lowerCaseKeyword = keyword.toLowerCase();
      
      // Use indexOf with case-insensitive comparison
      return lowerCaseText.includes(lowerCaseKeyword);
    } catch (error) {
      logger.error('Error checking keyword in PDF:', error);
      throw new Error('Error checking keyword in PDF.');
    }
};

const PORT = process.env.PORT || 5000; // Use environment variable for port
app.listen(PORT, () => {
  logger.log(`Server is running on port ${PORT}`);
});
