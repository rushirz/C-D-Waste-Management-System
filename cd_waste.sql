CREATE DATABASE IF NOT EXISTS cd_waste;

USE cd_waste;

CREATE TABLE submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100),
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE waste_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT,
    waste_type VARCHAR(50),
    quantity_kg INT,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE TABLE images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT,
    image_path VARCHAR(255),
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);
