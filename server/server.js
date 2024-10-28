// server/server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

// Store job status
const jobs = new Map();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Ensure directories exist
['uploads', 'processed'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

app.post('/start-processing', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const jobId = Date.now().toString();
  const inputPath = req.file.path;
  const outputPath = path.join('processed', `processed_${path.basename(req.file.path)}`);

  // Initialize job status
  jobs.set(jobId, {
    status: 'processing',
    progress: 0,
    inputPath,
    outputPath,
    error: null
  });

  // Start Python process
  const pythonProcess = spawn('python', [
    'process_image.py',
    inputPath,
    outputPath,
    '50',  // population_size
    '20'   // generations
  ]);

  let errorMessage = '';

  pythonProcess.stderr.on('data', (data) => {
    errorMessage += data.toString();
    console.error(`Python Error: ${data}`);
  });

  pythonProcess.stdout.on('data', (data) => {
    const message = data.toString();
    if (message.startsWith('PROGRESS:')) {
      const progress = parseInt(message.split(':')[1]);
      const job = jobs.get(jobId);
      if (job) {
        job.progress = progress;
      }
    }
  });

  pythonProcess.on('close', (code) => {
    const job = jobs.get(jobId);
    if (code === 0) {
      job.status = 'completed';
      job.progress = 100;
    } else {
      job.status = 'failed';
      job.error = errorMessage;
    }
  });

  res.json({ jobId });
});

app.get('/progress/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    status: job.status,
    progress: job.progress,
    error: job.error
  });
});

app.get('/result/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || job.status !== 'completed') {
    return res.status(404).json({ error: 'Result not found' });
  }

  res.sendFile(job.outputPath, { root: process.cwd() }, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      return res.status(500).json({ error: 'Error sending result' });
    }
    
    // Clean up files after sending
    setTimeout(() => {
      fs.unlink(job.inputPath, () => {});
      fs.unlink(job.outputPath, () => {});
      jobs.delete(req.params.jobId);
    }, 1000);
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});