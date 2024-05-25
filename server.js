const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Console } = require('console');

const app = express();
app.use(cors());

const logger = new Console(process.stdout, process.stderr);

// Configure Multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage }).array('files');

// Root endpoint to test server functionality
app.get("/", (req, res) => {
    logger.log("It's working");
    res.send("It's working");
});

// Upload endpoint to process PDF files and scan for keywords
app.post('/upload', upload, async (req, res) => {
  try {
    const keywords = req.body.keywords.split(',').map(keyword => keyword.trim().toLowerCase());
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files were uploaded.' });
    }

    const results = await Promise.all(files.map(async (file) => {
      if (file.mimetype === 'application/pdf') {
        const buffer = file.buffer;
        const keywordFound = await checkKeywordsInPDF(buffer, keywords);
        if (keywordFound) {
          logger.log(`File: ${file.originalname}, Keywords: Found`);
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

// Helper function to check if any keywords are present in the PDF
const checkKeywordsInPDF = async (buffer, keywords) => {
  try {
    const { text } = await pdfParse(buffer);
    const lowerCaseText = text.toLowerCase();
    return keywords.some(keyword => lowerCaseText.includes(keyword));
  } catch (error) {
    logger.error('Error checking keywords in PDF:', error);
    throw new Error('Error checking keywords in PDF.');
  }
};

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.log(`Server is running on port ${PORT}`);
});
