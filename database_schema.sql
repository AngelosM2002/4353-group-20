-- UserCredentials Table
CREATE TABLE UserCredentials (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'admin'))
);

-- UserProfile Table
CREATE TABLE UserProfile (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255),
    preferences TEXT,
    FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id)
);

-- Service Table
CREATE TABLE Service (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    expected_duration INT NOT NULL,
    priority_level INT DEFAULT 1
);

-- Queue Table
CREATE TABLE Queue (
    queue_id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'open', 'closed')),
    created_at DATETIME NOT NULL,
    FOREIGN KEY (service_id) REFERENCES Service(service_id)
);

-- QueueEntry Table
CREATE TABLE QueueEntry (
    entry_id INT AUTO_INCREMENT PRIMARY KEY,
    queue_id INT NOT NULL,
    user_id INT NOT NULL,
    position INT NOT NULL,
    join_time DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('waiting', 'served', 'cancelled')),
    FOREIGN KEY (queue_id) REFERENCES Queue(queue_id),
    FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id)
);

-- Notification Table
CREATE TABLE Notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('unread', 'read')),
    FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id)
);

-- History Table
CREATE TABLE History (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    queue_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    timestamp DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id),
    FOREIGN KEY (queue_id) REFERENCES Queue(queue_id)
);