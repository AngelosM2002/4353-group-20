const UserCredentials = require('../models/UserCredentials');
const UserProfile = require('../models/UserProfile');

exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    console.log('--- NEW REGISTRATION ATTEMPT ---');
    console.log(`Name: ${name} | Email: ${email} | Role: ${role}`);

    // format validation 
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ message: 'Name is required (min 2 chars)' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ message: 'A valid email is required' });
    }

    // password validation 
    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (!role || (role.toLowerCase() !== 'user' && role.toLowerCase() !== 'administrator')) {
        return res.status(400).json({ message: 'Role must be "User" or "Administrator"' });
    }

    try {
        // check if a user with this email already exists
        const existingUser = await UserCredentials.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            console.log(`[AUTH ERROR] Account cannot be created: ${email} already exists.`);
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        // create credentials (password gets hashed automatically by the pre-save hook)
        const credentials = await UserCredentials.create({
            email: email.toLowerCase(),
            password,
            role: role.toLowerCase()
        });

        // create the user profile linked to the credentials
        const profile = await UserProfile.create({
            userId: credentials._id,
            fullName: name.trim(),
            email: email.toLowerCase()
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: credentials._id,
                name: profile.fullName,
                email: credentials.email,
                role: credentials.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ message: 'Server error during registration' });
    }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    console.log('--- USER LOGIN ATTEMPT ---');
    console.log(`Email: ${email || '(missing)'}`);
    console.log('--------------------------');

    if (!email || !password) {
        console.warn('Login failed: missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Email and password must be valid strings' });
    }

    try {
        // find user credentials by email
        const credentials = await UserCredentials.findOne({ email: email.toLowerCase() });

        if (!credentials) {
            console.warn(`Login failed: no account found for ${email}`);
            return res.status(401).json({ message: 'invalid email or password' });
        }

        // compare the provided password against the stored hash
        const isMatch = await credentials.comparePassword(password);

        if (!isMatch) {
            console.warn(`Login failed: invalid credentials for ${email}`);
            return res.status(401).json({ message: 'invalid email or password' });
        }

        // fetch the user profile for the display name
        const profile = await UserProfile.findOne({ userId: credentials._id });

        console.log('--- USER LOGGED IN ---');
        console.log(`Name: ${profile ? profile.fullName : 'N/A'}`);
        console.log(`Email: ${credentials.email}`);
        console.log(`Role: ${credentials.role}`);
        console.log('----------------------');

        res.json({
            message: 'login successful',
            user: {
                name: profile ? profile.fullName : '',
                email: credentials.email,
                role: credentials.role
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Server error during login' });
    }
};