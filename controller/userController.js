const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const userModel = require('../modelS/userModel');
const db = require('../config/db')

const userController = {
    // Render login page
    users: (req, res) => {
        res.render('users/login', { error: null });
    },

    // Render registration view
    registration: (req, res) => {
        res.render('users/registration', { error: null });
    },

    registrationHandler: async (req, res) => {
      const { name, email, password } = req.body;
  
      userModel.findByEmail(email, async (err, users) => {
        if (err) return res.status(500).json({ message: 'Error checking user.' });
        if (users.length > 0) return res.status(400).json({ message: 'This email is already registered.' });
  
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          const verificationToken = crypto.randomBytes(32).toString('hex');
  
          userModel.create(
            { name, email, password: hashedPassword, verification_token: verificationToken },
            (err) => {
              if (err) return res.status(500).json({ message: 'Error registering user.' });
  
              const verificationUrl = `http://localhost:7200/verify-email?token=${verificationToken}`;
              const transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                  user: 'arrenbacarra442@gmail.com',
                  pass: 'tfin eynz fegk wrnf',
                },
              });
  
              transporter.sendMail(
                {
                  from: 'arrenbacarra442@gmail.com',
                  to: email,
                  subject: 'Email Verification',
                  text: `Please verify your email by clicking the link: ${verificationUrl}`,
                },
                (err) => {
                  if (err) return res.status(500).json({ message: 'Error sending verification email.' });
                  res.status(200).json({ message: 'Registration successful. Please verify your email.' });
                }
              );
            }
          );
        } catch (err) {
          res.status(500).json({ message: 'Error hashing password.' });
        }
      });
    },
    
    // Handle email verification
    verifyEmail: (req, res) => {
        const { token } = req.query;
    
        userModel.findByVerificationToken(token, (err, users) => {
            if (err) {
                console.error('Error finding user by verification token:', err);
                return res.status(500).send('Internal error occurred.');
            }
            if (users.length === 0) {
                return res.status(400).send('Invalid or expired verification token.');
            }
    
            const user = users[0];
    
            // Update user's verification status
            userModel.updateVerificationStatus(user.id, (err) => {
                if (err) {
                    console.error('Error updating verification status:', err);
                    return res.status(500).send('Error verifying email.');
                }
                res.send('Your email has been verified! You may now log in.');
            });
        });
    },

    loginHandler: async (req, res) => {
      const { email, password } = req.body;
    
      // Find user by email
      userModel.findByEmail(email, async (err, users) => {
        if (err || users.length === 0) {
          return res.status(401).json({ message: 'This account is not registered.' });
        }
    
        const user = users[0];
    
        // Check if the password matches
        const passwordMatch = await bcrypt.compare(password, user.password);
    
        if (!passwordMatch) {
          return res.status(401).json({ message: 'Incorrect password.' });
        }
    
        // Check if the user's email is verified
        if (!user.is_verified) {
          return res.status(401).json({ message: 'Please verify your email before logging in.' });
        }
    
        // Save user ID in session (if using sessions)
        req.session.userId = user.id;
    
        // Return a response with the role and success message
        res.status(200).json({
          message: 'Login successful',
          role: user.role,  // Include the role in the response
        });
      });
    },
    
      getUserProfile: (req, res) => {
        // Check if the user is authenticated
        if (!req.session.userId) {
          return res.status(401).json({ message: 'Unauthorized access' });
        }
      
        // Fetch user profile data from the database using session.userId
        const userId = req.session.userId;
        userModel.findById(userId, (err, user) => {
          if (err || !user) {
            return res.status(500).json({ message: 'Error fetching user data' });
          }
          // Return user data as response
          res.status(200).json(user);
        });
      },
      
      createApplication: (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized access. Please log in.' });
    }

    const studentData = req.body;

    // Create the student application
    userModel.createStudentApplication(studentData, userId, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error creating application' });
        }

        res.status(201).json({
            message: 'Application created successfully',
            studentId: result.studentId,  // Send back student_id generated by the database
        });
    });
},
      // Controller to update the logged-in user's profile
      updateUserProfile: (req, res) => {
        // Check if the user is authenticated
        if (!req.session.userId) {
          return res.status(401).json({ message: 'Unauthorized access' });
        }
      
        const userId = req.session.userId;
        const updatedData = req.body;
      
        // Update the user's profile in the database
        userModel.updateUserProfile(userId, updatedData, (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Error updating profile' });
          }
          res.status(200).json({ message: 'Profile updated successfully' });
        });

      },

      resetPasswordRequest: (req, res) => {
        const { email } = req.body;
    
        userModel.findByEmail(email, (err, users) => {
          if (err || users.length === 0) {
            return res.status(404).json({ message: 'Email not found.' });
          }
    
          const user = users[0];
          const resetToken = crypto.randomBytes(32).toString('hex');
          const resetUrl = `http://localhost:8080/reset-password?token=${resetToken}`;
    
          // Save reset token to database
          userModel.updateResetToken(user.id, resetToken, (err) => {
            if (err) {
              return res.status(500).json({ message: 'Error generating reset token.' });
            }
    
            // Send reset email
            const transporter = nodemailer.createTransport({
              service: 'Gmail',
              auth: {
                user: 'arrenbacarra442@gmail.com',
                pass: 'tfin eynz fegk wrnf',
              },
            });
    
            transporter.sendMail(
              {
                from: 'arrenbacarra442@gmail.com',
                to: email,
                subject: 'Reset Your Password',
                text: `Reset your password using this link: ${resetUrl}`,
              },
              (err) => {
                if (err) {
                  return res.status(500).json({ message: 'Error sending reset email.' });
                }
                res.status(200).json({ message: 'Reset link sent to your email.' });
              }
            );
          });
        });
      },
    
      // Verify reset token
      verifyResetToken: (req, res) => {
        const { token } = req.query;
    
        userModel.findByResetToken(token, (err, users) => {
          if (err || users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
          }
    
          res.status(200).json({ message: 'Token is valid.', userId: users[0].id });
        });
      },
    
      // Reset the password
      resetPassword: async (req, res) => {
        const { token, newPassword } = req.body;
    
        userModel.findByResetToken(token, async (err, users) => {
          if (err || users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
          }
    
          const user = users[0];
          const hashedPassword = await bcrypt.hash(newPassword, 10);
    
          userModel.updatePassword(user.id, hashedPassword, (err) => {
            if (err) {
              return res.status(500).json({ message: 'Error resetting password.' });
            }
            res.status(200).json({ message: 'Password has been reset successfully.' });
          });
        });
      },
      getNotifications: async (req, res) => {
        const studentId = req.session.userId;
      
        if (!studentId) {
          return res.status(401).json({ message: 'Unauthorized: No session detected' });
        }
      
        const query = 'SELECT status FROM application_status WHERE student_id = ?';
        db.query(query, [studentId], (error, results) => {
          if (error) {
            return res.status(500).json({ message: 'Error fetching notifications' });
          }
      
          const notifications = results.map(row => {
            let message = '';
            if (row.status === 'confirmed') {
              message = `Congratulations! Your scholarship application has been confirmed.`;
            } else if (row.status === 'rejected') {
              message = `Your scholarship application has not been approved.`;
            } else {
              message = `Your scholarship application is still pending.`;
            }
      
            return {
              student_id: studentId,
              message,
            };
          });
      
          res.json(notifications);
        });
      
      },

      

      
    };


module.exports = userController;