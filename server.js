const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// MySQL Connection (Direct Integration)
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'pranav07', // <-- replace with your MySQL password
  database: 'cd_waste'
});

connection.connect(err => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database');
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// API to handle form submission
app.post('/submit', upload.array('images'), async (req, res) => {
  const { username, email, location, wasteEntries } = req.body;
  const files = req.files;

  try {
    // Insert into submissions table
    connection.query(
      'INSERT INTO submissions (username, email, location) VALUES (?, ?, ?)',
      [username, email, location],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to insert submission' });
        }

        const submissionId = result.insertId;

        // Insert waste entries
        const parsedEntries = JSON.parse(wasteEntries);
        parsedEntries.forEach(entry => {
          connection.query(
            'INSERT INTO waste_entries (submission_id, waste_type, quantity_kg) VALUES (?, ?, ?)',
            [submissionId, entry.wasteCategory, entry.quantity],
            err => {
              if (err) console.error('Error inserting waste entry:', err);
            }
          );
        });

        // Insert image paths
        files.forEach(file => {
          const imagePath = path.join('uploads', file.filename);
          connection.query(
            'INSERT INTO images (submission_id, image_path) VALUES (?, ?)',
            [submissionId, imagePath],
            err => {
              if (err) console.error('Error inserting image path:', err);
            }
          );
        });

        res.status(200).json({ message: 'Submission successful' });
      }
    );
  } catch (error) {
    console.error('Error in submission:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Panel API - Fetch all submission data
app.get('/admin/entries', (req, res) => {
  const sql = `
    SELECT 
      s.id AS submission_id,
      s.username,
      s.email,
      s.location,
      s.created_at,
      GROUP_CONCAT(DISTINCT CONCAT(w.waste_type, ':', w.quantity_kg) SEPARATOR '|') AS waste_summary,
      GROUP_CONCAT(DISTINCT i.image_path) AS images
    FROM submissions s
    LEFT JOIN waste_entries w ON s.id = w.submission_id
    LEFT JOIN images i ON s.id = i.submission_id
    GROUP BY s.id
    ORDER BY s.created_at DESC;
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching admin entries:', err);
      return res.status(500).json({ error: 'Failed to fetch entries' });
    }

    const formattedResults = results.map(row => ({
      submissionId: row.submission_id,
      username: row.username,
      email: row.email,
      location: row.location,
      submitted_at: row.created_at,
      wasteEntries: row.waste_summary
        ? row.waste_summary.split('|').map(item => {
            const [wasteCategory, quantity] = item.split(':');
            return { wasteCategory, quantity };
          })
        : [],
      images: row.images ? row.images.split(',') : []
    }));

    res.json(formattedResults);
  });
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
