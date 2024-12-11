const db = require('../config/db');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');



const adminModel = {
    addPost: (title, content, userId) => {
        // Modified query to include userId in the insert statement
        const sql = `INSERT INTO posts (title, content, created_at) VALUES (?, ?, NOW())`;
        return new Promise((resolve, reject) => {
            db.query(sql, [title, content, userId], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    getPosts: () => {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    getApplicationData: () => {
        const sql = `
            SELECT s.student_id, s.student_number, s.firstname, s.lastname, s.m_initial, s.degree_program, 
                   s.year_level,s.gmail, s.phone_number, s.status_enrollment, s.zip_code, s.units, 
                   a.status AS application_status
            FROM students s
            LEFT JOIN application_status a ON s.student_id = a.student_id
            WHERE (a.status IS NULL OR a.status NOT IN ('confirmed', 'rejected'))
        `;
        return new Promise((resolve, reject) => {
            db.query(sql, (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    searchStudents: (searchQuery) => {
        const sql = `
            SELECT *
            FROM students
            WHERE 
                student_id = ? OR
                student_number = ? OR
                lastname LIKE CONCAT('%', ?, '%') OR
                firstname LIKE CONCAT('%', ?, '%')
        `;
        return new Promise((resolve, reject) => {
            db.query(sql, [searchQuery, searchQuery, searchQuery, searchQuery], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

   

    getStatus: (studentId, callback) => {
        const query = `SELECT status FROM application_status WHERE student_id = ?`;
        db.query(query, [studentId], callback);
    },

    insertStatus: (studentId, callback) => {
        const query = `INSERT INTO application_status (student_id, status) VALUES (?, 'pending')`;
        db.query(query, [studentId], callback);
    },

    updateStatus: (studentId, callback) => {
        const query = `
            UPDATE application_status 
            SET status = 'confirmed', updated_at = NOW() 
            WHERE student_id = ?
        `;
        db.query(query, [studentId], callback);
    },

    updateStatusToRejected: (studentId, callback) => {
        const query = `
            UPDATE application_status 
            SET status = 'rejected', updated_at = NOW() 
            WHERE student_id = ?
        `;
        db.query(query, [studentId], callback);
    },

    getConfirmedStudents: () => {
        const query = `
            SELECT s.student_id, s.student_number, s.firstname, s.lastname, s.m_initial, 
                   s.degree_program, s.year_level, s.phone_number, s.zip_code, 
                   s.units, a.updated_at,s.gmail
            FROM students s
            INNER JOIN application_status a ON s.student_id = a.student_id
            WHERE a.status = 'confirmed'
            ORDER BY a.updated_at DESC
        `;
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    getRejectedStudents: () => {
        const query = `
            SELECT s.student_id, s.student_number, s.firstname, s.lastname, s.m_initial, 
                   s.degree_program, s.year_level, s.gmail, s.phone_number, s.zip_code, 
                   s.units, a.updated_at
            FROM students s
            INNER JOIN application_status a ON s.student_id = a.student_id
            WHERE a.status = 'rejected'
            ORDER BY a.updated_at DESC
        `;
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    exportConfirmedStudents: () => {
    const query = `
        SELECT s.student_id, s.student_number, s.firstname, s.lastname, s.m_initial, s.degree_program, 
               s.year_level, s.phone_number, s.zip_code, s.units, a.updated_at, s.gmail
        FROM students s
        INNER JOIN application_status a ON s.student_id = a.student_id
        WHERE a.status = 'confirmed'
        ORDER BY a.updated_at DESC
    `;

    return new Promise((resolve, reject) => {
        db.query(query, async (err, results) => {
            if (err) {
                return reject(new Error(`Database query failed: ${err.message}`));
            }

            if (!results || results.length === 0) {
                return reject(new Error('No confirmed students found.'));
            }

            try {
                // Log the results for debugging
                console.log('First row:', results[0]);  // Check the data structure

                // Import and set up ExcelJS
                const ExcelJS = require('exceljs');
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Confirmed Students');

                // Define worksheet headers
                worksheet.columns = [
                    { header: 'Student ID', key: 'student_id', width: 15 },
                    { header: 'Student Number', key: 'student_number', width: 20 },
                    { header: 'First Name', key: 'firstname', width: 20 },
                    { header: 'Last Name', key: 'lastname', width: 20 },
                    { header: 'M_initial', key: 'm_initial', width: 25 },
                    { header: 'Degree Program', key: 'degree_program', width: 30 },
                    { header: 'Year Level', key: 'year_level', width: 10 },
                    { header: 'Phone Number', key: 'phone_number', width: 15 },
                    { header: 'Zip Code', key: 'zip_code', width: 10 },
                    { header: 'Enrolled Units', key: 'units', width: 15 },
                    { header: 'Updated At', key: 'updated_at', width: 20 },
                    { header: 'Gmail', key: 'gmail', width: 30 },
                ];

                // Add rows from results
                worksheet.addRows(results);

                // Ensure the export directory exists
                const exportsDir = path.join(__dirname, '../exports');
                if (!fs.existsSync(exportsDir)) {
                    fs.mkdirSync(exportsDir);
                }

                // Define the file path for the export
                const filePath = path.join(exportsDir, 'confirmed_students.xlsx');

                // Delete any existing file before writing the new one
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);  // Remove any existing file
                }

                // Write the file
                await workbook.xlsx.writeFile(filePath).catch((err) => {
                    console.error('Error writing Excel file:', err);  // Log any file write errors
                    reject(new Error(`Error exporting Excel file: ${err.message}`));
                });

                // Resolve the promise with the file path
                resolve(filePath);
            } catch (error) {
                console.error('Error exporting Excel file:', error);
                reject(new Error(`Error exporting Excel file: ${error.message}`));
            }
        });
    });
},
    

    getYearLevelData: (callback) => {
        const query = `
            SELECT s.year_level, COUNT(*) AS count
            FROM students s
            INNER JOIN application_status a ON s.student_id = a.student_id
            WHERE a.status = 'confirmed'
            GROUP BY s.year_level
        `;
        db.query(query, callback);
    },
    fetchAcceptanceRate: () => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT DATE_FORMAT(updated_at, '%Y-%m') AS date, 
                       SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
                       SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
                FROM application_status
                WHERE status IN ('confirmed', 'rejected')
                GROUP BY DATE_FORMAT(updated_at, '%Y-%m')
                ORDER BY DATE_FORMAT(updated_at, '%Y-%m');
            `;
            db.query(query, (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results);
            });
        });
    },
    

    getDegreeProgramData: (callback) => {
        const query = `
            SELECT s.degree_program, COUNT(*) AS count
            FROM students s
            INNER JOIN application_status a ON s.student_id = a.student_id
            WHERE a.status = 'confirmed'
            GROUP BY s.degree_program
        `;
        db.query(query, callback);
    },
    
};

module.exports = adminModel;
