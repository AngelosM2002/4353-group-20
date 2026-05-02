# QueueSmart

A web application that helps organizations manage queues and appointments efficiently. Users can join queues, view wait times, and receive notifications, while administrators can create services and monitor queue activity.

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/4353-group-20.git
   cd 4353-group-20
   ```

2. Backend Setup
### Navigate to the backend directory
   ```bash
   cd backend
   ```

### Install development dependencies
   ```bash
   npm install --save-dev jest supertest nodemon
   ```
- Open a new terminal window, navigate to the backend folder, and install the necessary dependencies:
   ```bash
   cd backend
   npm install
   npm start
   ```
- The server will run at http://localhost:3000.


3. Frontend Setup 

   - Use the commands:
     ```bash
     # Using Python
     python -m http.server 8000

     # Using Node.js
     npx serve .
     ```

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Testing:** Jest, Supertest

## Testing
The backend is fully tested using Jest and Supertest.

To run the test suite and view the coverage report:
```bash
cd backend
npx jest --coverage
```