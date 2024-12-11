const db = require('../config/db');

const userModel = {
    // Register a new user
    create: (data, callback) => {
      const query = 'INSERT INTO users (email, password, verification_token) VALUES (?, ?, ?)';
      db.query(query, [data.email, data.password, data.verification_token], callback);
    },

    // Get user by email (for login)
    findByEmail: (email, callback) => {
      const query = 'SELECT * FROM users WHERE email = ?';
      db.query(query, [email], callback);
    },

    // Get user by verification token
    findByVerificationToken: (token, callback) => {
      const query = 'SELECT * FROM users WHERE verification_token = ?';
      db.query(query, [token], callback);
    },

    // Get all users
    getAll: (callback) => {
        const query = "SELECT * FROM users";
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error retrieving all users:', err);
                return callback(err);
            }
            callback(null, results);
        });
    },// Existing method to fetch user and student data
    findById: (userId, callback) => {
      const query = `
        SELECT 
          u.id AS user_id,
          u.email,
          s.student_id,
          s.firstname,
          s.lastname,
          s.m_initial,
          s.degree_program,
          s.year_level,
          s.phone_number,
          s.status_enrollment AS student_status,
          s.zip_code AS zipcode,
          s.units AS unit,
          s.created_at,
          s.user_id
        FROM 
          users u
        JOIN 
          students s 
        ON 
          u.id = s.user_id
        WHERE 
          u.id = ?
      `;
      db.query(query, [userId], (err, result) => {
        if (err) {
          console.error('Error fetching user profile:', err);
          return callback(err);
        }
        callback(null, result[0]); // Return the first result
      });
    },
    createStudentApplication: (studentData, userId, callback) => {
    const query = `
        INSERT INTO students 
        (student_id, lastname, firstname, m_initial, degree_program, year_level, phone_number, status_enrollment, zip_code, units, gmail, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const studentId = studentData.student_id;  // Get student_id from the user input

    db.query(
        query,
        [
            studentId, // Use the student_id inputted by the user
            studentData.lastname,
            studentData.firstname,
            studentData.m_initial,
            studentData.degree_program,
            studentData.year_level,
            studentData.phone_number,
            studentData.status_enrollment,
            studentData.zip_code,
            studentData.units,
            studentData.gmail,
            userId,
        ],
        (err, result) => {
            if (err) {
                console.error('Error creating student application:', err);
                return callback(err);
            }
            callback(null, { studentId, affectedRows: result.affectedRows });
        }
    );
},

        // Update user's verification status without nullifying verification_token
        updateVerificationStatus: (userId, callback) => {
          const query = 'UPDATE users SET is_verified = 1 WHERE id = ?';
          db.query(query, [userId], callback);
        },

        getUserProfile: (userId, callback) => {
          const sql = `SELECT firstname, m_initial, lastname, gender, degree_program, year_level, email, phone_number, student_status, birthday, zipcode, unit FROM students WHERE user_id = ?`;
          db.query(sql, [userId], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0]);  // Return the first result (since userId is unique)
          });
        },

  updateUserProfile: (userId, updatedData, callback) => {
    const {
      firstname,
      m_initial,
      lastname,
      gender,
      degree_program,
      year_level,
      phone_number,
      student_status,
      birthday,
      zipcode,
      unit,
    } = updatedData;
  
    const sql = `UPDATE students SET firstname = ?, m_initial = ?, lastname = ?, gender = ?, degree_program = ?, year_level = ?, phone_number = ?, student_status = ?, birthday = ?, zipcode = ?, unit = ? WHERE id = ?`;
    db.query(
      sql,
      [firstname, m_initial, lastname, gender, degree_program, year_level, phone_number, student_status, birthday, zipcode, unit, userId],
      (err, result) => {
        if (err) return callback(err);
        callback(null, result);
      }
    );
  },

  updateResetToken: (userId, token, callback) => {
    const query = 'UPDATE users SET reset_token = ? WHERE id = ?';
    db.query(query, [token, userId], callback);
  },

  // Find user by reset token
  findByResetToken: (token, callback) => {
    const query = 'SELECT * FROM users WHERE reset_token = ?';
    db.query(query, [token], callback);
  },

  // Update user password
  updatePassword: (userId, newPassword, callback) => {
    const query = 'UPDATE users SET password = ?, reset_token = NULL WHERE id = ?';
    db.query(query, [newPassword, userId], callback);
  },
  // Fetch application statuses
  getApplicationStatuses: () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT student_id, status FROM application_status`;
        db.query(query, (error, results) => {
            if (error) {
                reject('Error fetching statuses');
            }
            resolve(results);
        });
    });
},

  
  
};

module.exports = userModel;