const express = require('express');
const router = express.Router();
const admin = require('../controller/admin');
const userController = require('../controller/userController');

const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized access. Please log in.' });
    }
    next(); // Proceed if authenticated
};

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out.' }); // Handle errors
        }
        res.clearCookie('connect.sid', { path: '/' }); // Clear the session cookie
        return res.status(200).json({ message: 'Logged out successfully.' }); // Return JSON response
    });
});


// user routes
router.get('/verify-email', userController.verifyEmail);
router.get('/register', userController.registration);
router.get('/login', userController.users);
router.post('/register', userController.registrationHandler); // Handle registration
router.post('/login', userController.loginHandler); // Handle login
// Route to create an application
router.post('/createApplication', userController.createApplication);


//router.get('/userprofile/:id', isAuthenticated, userController.getUserProfileById);
router.get('/userprofile', isAuthenticated, userController.getUserProfile);

router.put('/updateprofile', userController.updateUserProfile);

router.post('/reset-password-request', userController.resetPasswordRequest);
router.get('/reset-password', userController.verifyResetToken);
router.post('/reset-password', userController.resetPassword);

// Route to get notifications
router.get('/notifications', userController.getNotifications);


// Route for the home page
router.get('/', admin.home);
// Route for fetching all posts
router.get('/posts', admin.fetchPosts);

// Route for the application page (student applications)
router.get('/application', admin.application);

// Route for searching students
router.get('/search', admin.search);


// Route for adding a new post
router.post('/addPost', admin.addPost);

// Confirm student route (with student ID)
router.post('/confirmStudent/:studentId', admin.confirmStudent); // Confirm student
router.post('/rejectStudent/:studentId', admin.rejectStudent); // Reject student

// Routes for viewing confirmed and rejected students
router.get('/confirmed', admin.getConfirmedStudents); // List of confirmed students
router.get('/rejected', admin.getRejectedStudents); // List of rejected students

//Route for exporting the data of all confirmed students to excel files
router.get('/export/confirmed-students', admin.exportConfirmedStudents);

// Route for rendering the visualization page
router.get("/year_level_data", admin.renderYearLevelData);
  
router.get('/degree_program_data', admin.renderDegreeProgramData);

// Route to fetch acceptance rate data
router.get('/acceptance_rate_data', admin.getAcceptanceRateData);


module.exports = router;