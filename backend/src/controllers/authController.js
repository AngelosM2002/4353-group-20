const { users } = require('../data/memoryData');

exports.register = (req, res) => {
    const { name, email, password, role } = req.body;

    // This is the log that will show in your backend terminal
    console.log('--- NEW REGISTRATION ATTEMPT ---');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log('--------------------------------');

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const newUser = { name, email, password, role };
    users.push(newUser);

    res.status(201).json({ message: 'User registered in memory', user: newUser });
};

exports.login = (req, res) => {
    const { email, password } = req.body;
    
    console.log(`Login attempt for: ${email}`);

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        console.warn(`Login failed for: ${email}`);
        return res.status(401).json({ message: 'invalid email or password' });
    }

    console.log(`Login successful for: ${email}`);
    res.json({
        message: 'login successful',
        user: { name: user.name, email: user.email, role: user.role }
    });
};