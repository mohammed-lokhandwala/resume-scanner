const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Console } = require('console');
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json()); 

const logger = new Console(process.stdout, process.stderr);


const checkApiKey = (req, res, next) => {
  const checkApiKey = req.header('x-api-key');
  if (checkApiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: 'Incorrect API key.' });
  }
  next();
};

//express js multer for users to upload files
const storage = multer.memoryStorage();
const upload = multer({ storage }).array('files');


app.get("/", (req, res) => {
  logger.log("It's working");
  res.send("It's working");
});

//takes the file uploaded by the user using multer (stored in multer memory) also takes the keyword, if files length is less than 0 means no file upload so it rejects the request
//than it checks the file type, if it's  a pdf file than it accept  , buffer retrive files from the multer storage, than ketwordfound filter , if the keyword if found
// it retunns the filename and keyword
//)
app.post('/upload', checkApiKey, upload, async (req, res) => {
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



// take text from the files using pdfparse(buffer) convert that text to lower case , using .some(loop over each keyowrd and check if its in the text from pdf and teturn it)
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





























const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.log(`Server is running on port ${PORT}`);
});
