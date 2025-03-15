const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Initialize the app
const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log('MongoDB connection error:', err));

// Set up EJS for rendering views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Models
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String, // In production, hash this!
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' }
});

const JobSchema = new mongoose.Schema({
    title: String,
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    location: String,
    description: String,
    salary: Number,
    type: String, // e.g., Full-time, Part-time
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    applications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }]
});

const CompanySchema = new mongoose.Schema({
    name: String,
    location: String,
    logo: String,
    description: String,
    rating: Number
});

const ReviewSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    content: String,
    rating: Number
});

const ResumeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    phone: String,
    summary: String,
    experience: String,
    education: String,
    skills: String
});

const AlertSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    jobTitle: String,
    location: String,
    keywords: String,
    frequency: String
});

const ApplicationSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: String // e.g., Applied, Under Review
});

const ContactSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Job = mongoose.model('Job', JobSchema);
const Company = mongoose.model('Company', CompanySchema);
const Review = mongoose.model('Review', ReviewSchema);
const Resume = mongoose.model('Resume', ResumeSchema);
const Alert = mongoose.model('Alert', AlertSchema);
const Application = mongoose.model('Application', ApplicationSchema);
const Contact = mongoose.model('Contact', ContactSchema);

// Routes

// 1. Home Page
app.get('/', (req, res) => {
    res.render('index');
});

// 2. Dashboard (User)
app.get('/dashboard', async (req, res) => {
    // Assuming user is logged in (mock user ID for now)
    const userId = 'mockUserId'; // Replace with real auth logic
    try {
        const user = await User.findById(userId).populate('savedJobs');
        const applications = await Application.find({ user: userId }).populate('job');
        res.render('dashboard', { user, applications });
    } catch (err) {
        res.status(500).send('Error loading dashboard');
    }
});

// 3. Terms of Service
app.get('/terms', (req, res) => {
    res.render('terms');
});

// 4. Search Results
app.get('/search-results', async (req, res) => {
    const { query } = req.query;
    try {
        const jobs = await Job.find({ $text: { $search: query } });
        res.render('search-results', { jobs, query });
    } catch (err) {
        res.status(500).send('Error searching jobs');
    }
});

// 5. Saved Jobs
app.get('/saved-jobs', async (req, res) => {
    const userId = 'mockUserId'; // Replace with real auth
    try {
        const user = await User.findById(userId).populate('savedJobs');
        res.render('saved-jobs', { savedJobs: user.savedJobs });
    } catch (err) {
        res.status(500).send('Error loading saved jobs');
    }
});

app.post('/saved-jobs', async (req, res) => {
    const { jobId } = req.body;
    const userId = 'mockUserId'; // Replace with real auth
    try {
        await User.findByIdAndUpdate(userId, { $push: { savedJobs: jobId } });
        res.redirect('/saved-jobs');
    } catch (err) {
        res.status(500).send('Error saving job');
    }
});

// 6. Salary Insights
app.get('/salaries', async (req, res) => {
    const { jobTitle, location } = req.query;
    try {
        const jobs = await Job.find({ title: jobTitle, location });
        res.render('salaries', { jobs });
    } catch (err) {
        res.status(500).send('Error loading salary insights');
    }
});

// 7. Company Reviews
app.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().populate('company');
        res.render('reviews', { reviews });
    } catch (err) {
        res.status(500).send('Error loading reviews');
    }
});

app.post('/reviews', async (req, res) => {
    const { companyId, title, content, rating } = req.body;
    const userId = 'mockUserId'; // Replace with real auth
    try {
        const review = new Review({ company: companyId, user: userId, title, content, rating });
        await review.save();
        res.redirect('/reviews');
    } catch (err) {
        res.status(500).send('Error posting review');
    }
});

// 8. Resume Builder
app.get('/resume-builder', async (req, res) => {
    const userId = 'mockUserId'; // Replace with real auth
    try {
        const resume = await Resume.findOne({ user: userId });
        res.render('resume-builder', { resume });
    } catch (err) {
        res.status(500).send('Error loading resume builder');
    }
});

app.post('/resume-builder', async (req, res) => {
    const { name, email, phone, summary, experience, education, skills } = req.body;
    const userId = 'mockUserId'; // Replace with real auth
    try {
        let resume = await Resume.findOne({ user: userId });
        if (resume) {
            resume = await Resume.findOneAndUpdate(
                { user: userId },
                { name, email, phone, summary, experience, education, skills },
                { new: true }
            );
        } else {
            resume = new Resume({ user: userId, name, email, phone, summary, experience, education, skills });
            await resume.save();
            await User.findByIdAndUpdate(userId, { resume: resume._id });
        }
        res.redirect('/resume-builder');
    } catch (err) {
        res.status(500).send('Error saving resume');
    }
});

// 9. Register
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const user = new User({ name, email, password }); // Hash password in production
        await user.save();
        res.redirect('/login');
    } catch (err) {
        res.status(500).send('Error registering user');
    }
});

// 10. Profile
app.get('/profile', async (req, res) => {
    const userId = 'mockUserId'; // Replace with real auth
    try {
        const user = await User.findById(userId).populate('savedJobs resume');
        const applications = await Application.find({ user: userId }).populate('job');
        res.render('profile', { user, applications });
    } catch (err) {
        res.status(500).send('Error loading profile');
    }
});

// 11. Privacy Policy
app.get('/privacy', (req, res) => {
    res.render('privacy');
});

// 12. Post Job
app.get('/post-job', (req, res) => {
    res.render('post-job');
});

app.post('/post-job', async (req, res) => {
    const { title, company, location, description, salary, type } = req.body;
    const userId = 'mockUserId'; // Replace with real auth
    try {
        const job = new Job({ title, company, location, description, salary, type, postedBy: userId });
        await job.save();
        res.redirect('/employer-dashboard');
    } catch (err) {
        res.status(500).send('Error posting job');
    }
});

// 13. Login
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password }); // In production, compare hashed password
        if (user) res.redirect('/dashboard');
        else res.status(401).send('Invalid credentials');
    } catch (err) {
        res.status(500).send('Error logging in');
    }
});

// 14. Explore Jobs
app.get('/explore-jobs', async (req, res) => {
    try {
        const jobs = await Job.find().populate('company');
        res.render('explore-jobs', { jobs });
    } catch (err) {
        res.status(500).send('Error exploring jobs');
    }
});

// 15. Job Details
app.get('/job-details/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate('company');
        res.render('job-details', { job });
    } catch (err) {
        res.status(500).send('Error loading job details');
    }
});

// 16. Analytics Dashboard
app.get('/job-analytics', async (req, res) => {
    const userId = 'mockUserId'; // Replace with real auth
    try {
        const jobs = await Job.find({ postedBy: userId });
        res.render('job-analytics', { jobs });
    } catch (err) {
        res.status(500).send('Error loading analytics');
    }
});

// 17. Job Alerts
app.get('/job-alerts', async (req, res) => {
    const userId = 'mockUserId'; // Replace with real auth
    try {
        const alerts = await Alert.find({ user: userId });
        res.render('job-alerts', { alerts });
    } catch (err) {
        res.status(500).send('Error loading job alerts');
    }
});

app.post('/job-alerts', async (req, res) => {
    const { jobTitle, location, keywords, frequency } = req.body;
    const userId = 'mockUserId'; // Replace with real auth
    try {
        const alert = new Alert({ user: userId, jobTitle, location, keywords, frequency });
        await alert.save();
        res.redirect('/job-alerts');
    } catch (err) {
        res.status(500).send('Error creating job alert');
    }
});

// 18. Discover Your Career
app.get('/career', async (req, res) => {
    try {
        const jobs = await Job.find().limit(10); // Limit to 10 for demo
        res.render('career', { jobs });
    } catch (err) {
        res.status(500).send('Error loading career page');
    }
});

// 19. Interview Experiences
app.get('/interviews', async (req, res) => {
    try {
        const reviews = await Review.find().populate('company'); // Using reviews as interviews for simplicity
        res.render('interviews', { reviews });
    } catch (err) {
        res.status(500).send('Error loading interviews');
    }
});

// 20. Employer Profile (Tech Innovations)
app.get('/company-profile', async (req, res) => {
    try {
        const company = await Company.findOne({ name: 'Tech Innovations' });
        const jobs = await Job.find({ company: company._id });
        res.render('company-profile', { company, jobs });
    } catch (err) {
        res.status(500).send('Error loading company profile');
    }
});

// 21. Employer Dashboard
app.get('/employer-dashboard', async (req, res) => {
    const userId = 'mockUserId'; // Replace with real auth
    try {
        const jobs = await Job.find({ postedBy: userId }).populate('applications');
        res.render('employer-dashboard', { jobs });
    } catch (err) {
        res.status(500).send('Error loading employer dashboard');
    }
});

// 22. Contact
app.get('/contact', (req, res) => {
    res.render('contact');
});

app.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        const contact = new Contact({ name, email, message });
        await contact.save();
        res.redirect('/contact');
    } catch (err) {
        res.status(500).send('Error sending message');
    }
});

// 23. Company Details
app.get('/company-details/:id', async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        const jobs = await Job.find({ company: company._id });
        const reviews = await Review.find({ company: company._id });
        res.render('company-details', { company, jobs, reviews });
    } catch (err) {
        res.status(500).send('Error loading company details');
    }
});

// 404 Error Handling
app.use((req, res) => {
    res.status(404).render('404');
});


app.post('/account/update', async (req, res) => {
    const accountData = req.body;
    // Save to MongoDB
    res.redirect('/account-details');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});