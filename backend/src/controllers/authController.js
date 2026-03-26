const { users } = require('../data/memoryData');

exports.register = (req, res) => {
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

    // check uniqueness
    const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    const nameExists = users.some(u => u.name.toLowerCase() === name.toLowerCase());

    if (emailExists || nameExists) {
        // THIS IS THE TERMINAL LOG YOU WANTED
        console.log(`[AUTH ERROR] Account cannot be created: ${email} or ${name} already exists.`);
        
        const message = emailExists ? 'An account with this email already exists.' : 'This username/name is already taken.';
        return res.status(400).json({ message: message });
    }


    // password validation 
    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (!role || (role.toLowerCase() !== 'user' && role.toLowerCase() !== 'administrator')) {
        return res.status(400).json({ message: 'Role must be "User" or "Administrator"' });
    }

    // save user
    const newUser = { name, email, password, role };
    users.push(newUser);

    res.status(201).json({ message: 'User registered successfully', user: newUser });
};


exports.login = (req, res) => {
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

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        console.warn(`Login failed: invalid credentials for ${email}`);
        return res.status(401).json({ message: 'invalid email or password' });
    }

    console.log('--- USER LOGGED IN ---');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log('----------------------');

    res.json({
        message: 'login successful',
        user: { name: user.name, email: user.email, role: user.role }
    });
};