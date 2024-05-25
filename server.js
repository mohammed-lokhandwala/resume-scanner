const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Console } = require('console');

const app = express();
app.use(cors());

const logger = new Console();

// Removed multer storage configuration and file-related code

app.get("/", (req, res) => {
    console.log("It's working");
    res.send("It's working");
});

const upload = multer().array('files');

app.post('/upload', upload, async (req, res) => {
  try {
    const keywords = req.body.keywords.split(',').map(keyword => keyword.trim());
    const files = req.files;

    const results = await Promise.all(files.map(async (file) => {
      if (file.mimetype === 'application/pdf') {
        const buffer = file.buffer; // Get the buffer containing the file data
        const keywordResults = await Promise.all(keywords.map(async (keyword) => {
          if (await checkKeywordInPDF(buffer, keyword)) {
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
  } catch (error) {
    logger.error('Error uploading files:', error);
    res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
});

const checkKeywordInPDF = async (fileBuffer, keyword) => {
    try {
      const { text } = await pdfParse(fileBuffer);
      
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.log(`Server is running on port ${PORT}`);
});
